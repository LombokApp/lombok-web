import type {
  ContainerProfileConfig,
  JsonSerializableObject,
} from '@lombokapp/types'
import { AsyncWorkError, buildUnexpectedError } from '@lombokapp/worker-utils'
import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Scope,
} from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { and, eq } from 'drizzle-orm'
import { appsTable } from 'src/app/entities/app.entity'
import { coreConfig } from 'src/core/config'
import { buildPlatformOrigin } from 'src/core/utils/platform-origin.util'
import { waitForTrue, WaitForTrueError } from 'src/core/utils/wait.util'
import { OrmService } from 'src/orm/orm.service'

import {
  DockerExecuteJobOptions,
  JobExecuteOptions,
} from './client/docker.schema'
import { DockerClientService } from './client/docker-client.service'
import {
  ConnectionTestResult,
  DockerError,
  DockerHostResources,
  DockerLogAccessError,
  DockerLogEntry,
  DockerStateFunc,
} from './client/docker-client.types'
import { DockerWorkerHookService } from './docker-worker-hook.service'

const DEFAULT_WAIT_FOR_SUBMISSION_OPTIONS = {
  maxRetries: 50,
  retryPeriodMs: 250,
}

const DEFAULT_WAIT_FOR_COMPLETION_OPTIONS = {
  maxRetries: 100,
  retryPeriodMs: 250,
}

/** Labels applied to worker containers for discovery */
export const DOCKER_LABELS = {
  PLATFORM: 'lombok',
  PROFILE_ID: 'lombok.profile_id',
  PROFILE_HASH: 'lombok.profile_hash',
} as const

@Injectable({ scope: Scope.DEFAULT })
export class DockerJobsService {
  private readonly logger = new Logger(DockerJobsService.name)
  dockerWorkerHookService: DockerWorkerHookService
  constructor(
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
    private readonly ormService: OrmService,
    private readonly dockerClientService: DockerClientService,
    @Inject(forwardRef(() => DockerWorkerHookService))
    _dockerWorkerHookService,
  ) {
    this.dockerWorkerHookService =
      _dockerWorkerHookService as DockerWorkerHookService
    void this.dockerClientService.testAllHostConnections().then((result) => {
      this.logger.debug('Docker host connection test result:', result)
    })
  }

  /**
   * Get the profile spec for a given app and profile name
   */
  async getProfileSpec(
    appIdentifier: string,
    profileIdentifier: string,
  ): Promise<ContainerProfileConfig> {
    const app = await this.ormService.db.query.appsTable.findFirst({
      where: and(
        eq(appsTable.identifier, appIdentifier),
        eq(appsTable.enabled, true),
      ),
    })

    if (!app) {
      throw new NotFoundException(`App not found: ${appIdentifier}`)
    }

    if (!(profileIdentifier in app.containerProfiles)) {
      throw new NotFoundException(
        `Container profile "${profileIdentifier}" not found for app "${appIdentifier}"`,
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return app.containerProfiles[profileIdentifier]!
  }

  /**
   * Validate that the job class exists in the profile spec and return it
   */
  private resolveProfileJobDefinition(
    profileSpec: ContainerProfileConfig,
    jobIdentifier: string,
  ) {
    const workerDefinition = profileSpec.workers.find(
      (worker) =>
        (worker.kind === 'exec' && worker.jobIdentifier === jobIdentifier) ||
        (worker.kind === 'http' &&
          worker.jobs.find((job) => job.identifier === jobIdentifier)),
    )

    if (!workerDefinition) {
      const availableJobClasses = profileSpec.workers.flatMap((worker) =>
        worker.kind === 'exec'
          ? [worker.jobIdentifier]
          : worker.jobs.map((job) => job.identifier),
      )
      throw new NotFoundException(
        `Job class "${jobIdentifier}" not found. Available: ${availableJobClasses.join(', ') || '(none)'}`,
      )
    }
    if (workerDefinition.kind === 'exec') {
      return workerDefinition
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const jobDefinition = workerDefinition.jobs.find(
      (job) => job.identifier === jobIdentifier,
    )!

    return {
      jobIdentifier: jobDefinition.identifier,
      maxPerContainer: jobDefinition.maxPerContainer,
      countTowardsGlobalCap: jobDefinition.countTowardsGlobalCap,
      priority: jobDefinition.priority,
      command: workerDefinition.command,
      kind: workerDefinition.kind,
      port: workerDefinition.port,
    }
  }

  /**
   * Build container labels for worker discovery and identification
   */
  private buildContainerLabels(
    profileIdentifier: string,
    profileHash: string,
  ): Record<string, string> {
    return {
      [DOCKER_LABELS.PLATFORM]: 'lombok',
      [DOCKER_LABELS.PROFILE_HASH]: profileHash,
      [DOCKER_LABELS.PROFILE_ID]: profileIdentifier,
    }
  }

  /**
   * Execute a docker job, synchronously or asynchronously.
   *
   */
  async executeDockerJob<T extends boolean>(
    params: DockerExecuteJobOptions,
    waitForCompletion: T,
  ): Promise<DockerExecResult<T>> {
    try {
      const { jobIdentifier, jobData, profileKey, profileSpec } = params

      // generate a job id to represent this execution
      const jobId = crypto.randomUUID()

      // Generate a hash for the profile to track config drift
      const profileHash = this.hashProfileSpec(profileSpec)
      const jobDefinition = this.resolveProfileJobDefinition(
        profileSpec,
        jobIdentifier,
      )

      const containerProfileIdentifier = `lombok:profile_${profileKey}`
      // Build labels for container discovery

      const labels = this.buildContainerLabels(
        containerProfileIdentifier,
        profileHash,
      )

      // create the worker token if one is required
      const jobToken =
        params.asyncTaskId || params.storageAccessPolicy
          ? this.dockerWorkerHookService.createDockerWorkerJobToken({
              jobId,
              ...(params.asyncTaskId ? { taskId: params.asyncTaskId } : {}),
              storageAccessPolicy: params.storageAccessPolicy,
              executorContext: {
                profileKey,
                profileHash,
                jobIdentifier,
              },
            })
          : undefined

      const jobExecuteOptions: JobExecuteOptions = {
        job_id: jobId,
        job_class: jobIdentifier,
        job_input: jobData,
        job_token: jobToken,
        worker_command: jobDefinition.command, // Default worker path, can be customized per job class
        interface:
          jobDefinition.kind === 'http'
            ? {
                kind: 'persistent_http',
                port: jobDefinition.port,
              }
            : {
                kind: 'exec_per_job',
              },
        platform_url: !jobToken
          ? undefined
          : buildPlatformOrigin(this._coreConfig),
        output_location: params.storageAccessPolicy?.outputLocation
          ? {
              folder_id: params.storageAccessPolicy.outputLocation.folderId,
              ...('prefix' in params.storageAccessPolicy.outputLocation
                ? { prefix: params.storageAccessPolicy.outputLocation.prefix }
                : {}),
              ...('objectKey' in params.storageAccessPolicy.outputLocation
                ? {
                    objectKey:
                      params.storageAccessPolicy.outputLocation.objectKey,
                  }
                : {}),
            }
          : undefined,
      }

      // Base64 encode the payload
      const payloadBase64 = Buffer.from(
        JSON.stringify(jobExecuteOptions),
      ).toString('base64')

      // Build the command to run in the container
      const agentCommand = [
        'lombok-worker-agent',
        'run-job',
        `--payload-base64=${payloadBase64}`,
      ]

      const { hostId, containerId, state, output, getError } =
        await this.dockerClientService.execInProfileContainer(profileKey, {
          image: profileSpec.image,
          command: agentCommand,
          labels,
        })

      // Wait for the agent exec call to complete, signifying that the job has been submitted
      try {
        await this.waitForStarted(
          jobId,
          state,
          getError,
          output,
          () => this.getJobState(hostId, containerId, jobId),
          jobDefinition.kind,
        )
        this.logger.debug(`Job ${jobId} submitted successfully`)
      } catch (error) {
        this.logger.debug(
          `Job ${jobId} submission failed: ${error instanceof Error ? error.message : String(error)}.`,
        )
        if (error instanceof AsyncWorkError) {
          throw error
        }
        throw buildUnexpectedError({
          code: 'UNEXPECTED_ERROR_IN_EXECUTE_DOCKER_JOB',
          message: 'Unexpected error in executeDockerJob',
          error,
        })
      }

      if (waitForCompletion) {
        const completionResult = await this.waitForCompletion(
          hostId,
          containerId,
          jobId,
        )
        return completionResult
      } else {
        const submitResult: DockerSubmitResult = {
          jobId,
        }
        return submitResult as DockerExecResult<T>
      }
    } catch (error) {
      if (error instanceof AsyncWorkError) {
        throw error
      }
      this.logger.error('Unexpected error in executeDockerJob:', error)
      throw buildUnexpectedError({
        code: 'UNEXPECTED_ERROR_IN_EXECUTE_DOCKER_JOB',
        message: 'Unexpected error in executeDockerJob',
        error,
      })
    }
  }

  /**
   * Generate a simple hash for the profile spec to detect config drift
   */
  public hashProfileSpec(profileSpec: ContainerProfileConfig): string {
    const content = JSON.stringify(profileSpec)
    // Simple hash function - in production you might want something more robust
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16)
  }

  private async waitForStarted(
    jobId: string,
    execState: DockerStateFunc,
    getError: () => Promise<DockerError>,
    execOutput: () => { stdout: string; stderr: string },
    jobState: () => Promise<DockerJobState>,
    jobKind: 'exec' | 'http',
    {
      maxRetries = DEFAULT_WAIT_FOR_SUBMISSION_OPTIONS.maxRetries,
      retryPeriodMs = DEFAULT_WAIT_FOR_SUBMISSION_OPTIONS.retryPeriodMs,
    }: {
      maxRetries?: number
      retryPeriodMs?: number
    } = DEFAULT_WAIT_FOR_SUBMISSION_OPTIONS,
  ) {
    const jobHasStarted = async () => {
      const currentState = await execState(maxRetries * retryPeriodMs)
      if (!currentState.running && currentState.exitCode !== 0) {
        const error = await getError()
        throw new AsyncWorkError({
          name: 'DockerWorkerSubmissionError',
          origin: 'internal',
          code: error.code,
          message: `Job submission failed with error: [${error.code}] Message: ${error.message}`,
        })
      }

      if (!currentState.running || jobKind === 'exec') {
        // For exec jobs this means the job was completed (success or failure), but for http jobs it
        // just means the initial submit call is completed, but not that the job is even running.
        const _jobState = await jobState()
        if (_jobState.status === 'failed') {
          const error = new AsyncWorkError({
            name: 'DockerWorkerError',
            origin: 'internal',
            code: !_jobState.started_at
              ? 'DOCKER_JOB_SUBMISSION_ERROR'
              : 'DOCKER_JOB_EXECUTION_ERROR',
            message: `Job submission failed: ${_jobState.error}`,
          })

          throw error
        }
        // the dispatch exec is no longer running, and there's no reported failure in the job state, so we've officially submitted the job
        return true
      }
      return false
    }

    try {
      await waitForTrue(jobHasStarted, {
        maxRetries,
        retryPeriodMs,
        totalMaxDurationMs: maxRetries * retryPeriodMs,
      })
    } catch (error) {
      if (error instanceof WaitForTrueError && error.code === 'TIMEOUT') {
        this.logger.warn('Docker job waitForStarted timeout')
        throw new AsyncWorkError({
          name: 'DockerWorkerSubmissionError',
          origin: 'internal',
          code: 'SUBMISSION_TIMEOUT',
          message: `Job submission timed out after approximately ${maxRetries * retryPeriodMs}ms`,
        })
      } else if (error instanceof AsyncWorkError) {
        throw error
      }
      throw buildUnexpectedError({
        code: 'UNEXPECTED_ERROR_IN_EXECUTE_DOCKER_JOB',
        message: 'Unexpected error in waitForStarted',
        error,
      })
    }
  }

  private async waitForCompletion(
    hostId: string,
    containerId: string,
    jobId: string,
    {
      maxRetries = DEFAULT_WAIT_FOR_COMPLETION_OPTIONS.maxRetries,
      retryPeriodMs = DEFAULT_WAIT_FOR_COMPLETION_OPTIONS.retryPeriodMs,
    }: {
      maxRetries?: number
      retryPeriodMs?: number
    } = DEFAULT_WAIT_FOR_COMPLETION_OPTIONS,
  ): Promise<DockerJobResult> {
    const latestState = () => this.getJobState(hostId, containerId, jobId)
    let currentJobState: DockerJobState = await latestState()
    const hasCompleted = () => !!currentJobState.completed_at

    await waitForTrue(
      async () => {
        currentJobState = await latestState()
        return hasCompleted()
      },
      {
        maxRetries,
        retryPeriodMs,
        totalMaxDurationMs: maxRetries * retryPeriodMs,
      },
    )

    if (hasCompleted()) {
      const jobResult = await this.getJobResult(hostId, containerId, jobId)
      if (currentJobState.status === 'success') {
        return jobResult
      } else if (currentJobState.status === 'failed') {
        const jobError = await this.getJobResult(hostId, containerId, jobId)
        return jobError
      }
    }
    throw new AsyncWorkError({
      name: 'DockerWorkerCompletionError',
      origin: 'internal',
      code: 'COMPLETION_TIMEOUT',
      message: `Job is not completed after approximately ${maxRetries * retryPeriodMs}ms`,
    })
  }

  private async getAgentLogs(
    hostId: string,
    containerId: string,
    options?: { tail?: number; grep?: string },
  ): Promise<string> {
    const command = ['lombok-worker-agent', 'agent-log']

    if (options?.grep) {
      command.push('--grep', options.grep)
    }

    if (options?.tail) {
      command.push('--tail', options.tail.toString())
    }

    const { output, state } = await this.dockerClientService.execInContainer(
      hostId,
      containerId,
      command,
    )

    await waitForTrue(
      async () => {
        const _state = await state(5000)
        return !_state.running
      },
      {
        maxRetries: 10,
        retryPeriodMs: 100,
        totalMaxDurationMs: 1000,
      },
    )

    const streamsOutput = output()

    if (streamsOutput.stderr.length > 0) {
      throw new DockerLogAccessError(
        'AGENT_LOG_ACCESS_ERROR',
        'Error getting agent log: ' + streamsOutput.stderr,
      )
    }
    return streamsOutput.stdout
  }

  private async getJobState(
    hostId: string,
    containerId: string,
    jobId: string,
  ): Promise<DockerJobState> {
    const command = ['lombok-worker-agent', 'job-state', '--job-id', jobId]

    const { getError, output, state } =
      await this.dockerClientService.execInContainer(
        hostId,
        containerId,
        command,
      )

    await waitForTrue(
      async () => {
        const _state = await state(5000)
        return !_state.running
      },
      {
        maxRetries: 10,
        retryPeriodMs: 100,
        totalMaxDurationMs: 1000,
      },
    )

    const latestState = await state(5000)
    if (latestState.exitCode !== 0) {
      throw await getError()
    }

    const streamsOutput = output()

    if (streamsOutput.stdout.length === 0) {
      throw new AsyncWorkError({
        name: 'DockerWorkerStateError',
        origin: 'internal',
        code: 'JOB_STATE_NOT_FOUND',
        message:
          'Job state not found\nError: ' +
          streamsOutput.stderr +
          '\n' +
          streamsOutput.stderr,
      })
    }
    return JSON.parse(streamsOutput.stdout) as DockerJobState
  }

  private async getJobResult(
    hostId: string,
    containerId: string,
    jobId: string,
  ): Promise<DockerJobResult> {
    const command = ['lombok-worker-agent', 'job-result', '--job-id', jobId]

    const { output, state } = await this.dockerClientService.execInContainer(
      hostId,
      containerId,
      command,
    )

    await waitForTrue(
      async () => {
        const _state = await state(5000)
        return !_state.running
      },
      {
        maxRetries: 10,
        retryPeriodMs: 100,
        totalMaxDurationMs: 1000,
      },
    )

    const streamsOutput = output()

    const agentResponse =
      streamsOutput.stdout.length > 0
        ? (JSON.parse(streamsOutput.stdout) as DockerJobResultAgent)
        : undefined

    return agentResponse
      ? {
          ...agentResponse,
          jobId: agentResponse.job_id,
        }
      : {
          success: false,
          jobId,
          error: {
            code: 'JOB_RESULT_NOT_FOUND',
            message: 'Job result not found\nError: ' + streamsOutput.stderr,
          },
          timing: {},
        }
  }

  private async getJobLogs(
    hostId: string,
    containerId: string,
    options: { jobId: string; tail?: number },
  ): Promise<string> {
    const command = [
      'lombok-worker-agent',
      'job-log',
      '--job-id',
      options.jobId,
    ]

    if (options.tail) {
      command.push('--tail', options.tail.toString())
    }

    const { output, state } = await this.dockerClientService.execInContainer(
      hostId,
      containerId,
      command,
    )

    await waitForTrue(
      async () => {
        const _state = await state(5000)
        return !_state.running
      },
      {
        maxRetries: 10,
        retryPeriodMs: 100,
        totalMaxDurationMs: 1000,
      },
    )

    const streamsOutput = output()

    if (streamsOutput.stderr.length > 0) {
      throw new DockerLogAccessError(
        'JOB_LOG_ACCESS_ERROR',
        'Error getting job log: ' + streamsOutput.stderr,
      )
    }
    return streamsOutput.stdout
  }

  async listContainerJobStateFiles(
    hostId: string,
    containerId: string,
  ): Promise<string[]> {
    const { output, state } = await this.dockerClientService.execInContainer(
      hostId,
      containerId,
      [
        'sh',
        '-c',
        'ls -1t /var/lib/lombok-worker-agent/jobs/*.json 2>/dev/null || true',
      ],
    )

    await waitForTrue(
      async () => {
        const execState = await state(5000)
        return !execState.running
      },
      {
        maxRetries: 10,
        retryPeriodMs: 100,
        totalMaxDurationMs: 1000,
      },
    )

    const streamsOutput = output()

    return streamsOutput.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  }

  async listContainerWorkerStateFiles(
    hostId: string,
    containerId: string,
  ): Promise<string[]> {
    const { output, state } = await this.dockerClientService.execInContainer(
      hostId,
      containerId,
      [
        'sh',
        '-c',
        'ls -1t /var/lib/lombok-worker-agent/workers/http_*.json 2>/dev/null || true',
      ],
    )

    await waitForTrue(
      async () => {
        const execState = await state(5000)
        return !execState.running
      },
      {
        maxRetries: 10,
        retryPeriodMs: 100,
        totalMaxDurationMs: 1000,
      },
    )

    const streamsOutput = output()

    return streamsOutput.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  }

  async listContainerWorkerJobStateFiles(
    hostId: string,
    containerId: string,
    workerId: string,
  ): Promise<string[]> {
    const port = this.parseWorkerPort(workerId)
    const safeWorkerId = `http_${port}`

    const { output, state } = await this.dockerClientService.execInContainer(
      hostId,
      containerId,
      [
        'sh',
        '-c',
        `ls -1t /var/lib/lombok-worker-agent/worker-jobs/${safeWorkerId}/*.json 2>/dev/null || true`,
      ],
    )

    await waitForTrue(
      async () => {
        const execState = await state(5000)
        return !execState.running
      },
      {
        maxRetries: 10,
        retryPeriodMs: 100,
        totalMaxDurationMs: 1000,
      },
    )

    const streamsOutput = output()

    return streamsOutput.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  }

  async getContainerWorkerState(
    hostId: string,
    containerId: string,
    workerId: string,
  ): Promise<unknown> {
    const port = this.parseWorkerPort(workerId)
    const command = ['lombok-worker-agent', 'worker-state', '--port', `${port}`]

    const { getError, output, state } =
      await this.dockerClientService.execInContainer(
        hostId,
        containerId,
        command,
      )

    await waitForTrue(
      async () => {
        const _state = await state(5000)
        return !_state.running
      },
      {
        maxRetries: 10,
        retryPeriodMs: 100,
        totalMaxDurationMs: 1000,
      },
    )

    const latestState = await state(5000)
    if (latestState.exitCode !== 0) {
      throw await getError()
    }

    const streamsOutput = output()

    if (streamsOutput.stdout.length === 0) {
      throw new AsyncWorkError({
        name: 'DockerWorkerStateError',
        origin: 'internal',
        code: 'WORKER_STATE_NOT_FOUND',
        message:
          'Worker state not found\nError: ' +
          streamsOutput.stderr +
          '\n' +
          streamsOutput.stderr,
      })
    }

    return JSON.parse(streamsOutput.stdout)
  }

  async getContainerJobState(
    hostId: string,
    containerId: string,
    jobId: string,
  ): Promise<DockerJobState> {
    return this.getJobState(hostId, containerId, jobId)
  }

  async getContainerJobLogEntries(
    hostId: string,
    containerId: string,
    jobId: string,
    tail?: number,
  ): Promise<{ entries: DockerLogEntry[]; logError?: string }> {
    const entries: DockerLogEntry[] = []
    const errors: string[] = []

    try {
      const content = await this.getJobLogs(hostId, containerId, {
        jobId,
        tail,
      })
      if (content.length > 0) {
        entries.push({ stream: 'stdout', text: content })
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }

    return {
      entries,
      logError: errors.length > 0 ? errors.join('\n') : undefined,
    }
  }

  async purgeContainerJobs(
    hostId: string,
    containerId: string,
    options?: { olderThan?: string },
  ): Promise<{ message: string }> {
    const command = ['lombok-worker-agent', 'purge-jobs']
    if (options?.olderThan) {
      command.push('--older-than', options.olderThan)
    }

    const { getError, output, state } =
      await this.dockerClientService.execInContainer(
        hostId,
        containerId,
        command,
      )

    await waitForTrue(
      async () => {
        const execState = await state(5000)
        return !execState.running
      },
      {
        maxRetries: 10,
        retryPeriodMs: 100,
        totalMaxDurationMs: 1000,
      },
    )

    const latestState = await state(5000)
    if (latestState.exitCode !== 0) {
      throw await getError()
    }

    const streamsOutput = output()
    if (streamsOutput.stderr.length > 0) {
      throw new DockerLogAccessError(
        'PURGE_JOBS_ERROR',
        'Error purging job files: ' + streamsOutput.stderr,
      )
    }

    return { message: streamsOutput.stdout.trim() || 'Purge completed.' }
  }

  async getDockerHostState(hostId: string): Promise<DockerHostState> {
    let connection: ConnectionTestResult
    try {
      connection = await this.dockerClientService.testHostConnection(hostId)
    } catch (error) {
      connection = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }

    let resources: DockerHostResources | undefined
    if (connection.success) {
      try {
        resources = await this.dockerClientService.getHostResources(hostId)
      } catch {
        resources = undefined
      }
    }

    let containers: DockerHostContainerState[] = []
    let containersError: string | undefined
    try {
      const rawContainers =
        await this.dockerClientService.listContainersByLabels(hostId, {
          [DOCKER_LABELS.PLATFORM]: 'lombok',
        })
      containers = rawContainers.map((container) => ({
        ...container,
        profileId: container.labels[DOCKER_LABELS.PROFILE_ID],
        profileHash: container.labels[DOCKER_LABELS.PROFILE_HASH],
      }))
    } catch (error) {
      containersError = error instanceof Error ? error.message : String(error)
    }

    return {
      id: hostId,
      description: this.dockerClientService.getHostDescription(hostId),
      connection,
      resources,
      containers,
      containersError,
    }
  }

  async getDockerHostStates(): Promise<DockerHostState[]> {
    const hostIds = Object.keys(this._coreConfig.dockerHostConfig.hosts ?? {})
    return Promise.all(hostIds.map((hostId) => this.getDockerHostState(hostId)))
  }

  private parseWorkerPort(workerId: string): number {
    const normalized = workerId.endsWith('.json')
      ? workerId.slice(0, -'.json'.length)
      : workerId
    if (!normalized.startsWith('http_')) {
      throw new AsyncWorkError({
        name: 'DockerWorkerStateError',
        origin: 'internal',
        code: 'WORKER_STATE_NOT_FOUND',
        message: `Worker ID must start with "http_": ${workerId}`,
      })
    }
    const port = Number.parseInt(normalized.slice('http_'.length), 10)
    if (!Number.isFinite(port) || port <= 0) {
      throw new AsyncWorkError({
        name: 'DockerWorkerStateError',
        origin: 'internal',
        code: 'WORKER_STATE_NOT_FOUND',
        message: `Invalid worker port in worker ID: ${workerId}`,
      })
    }
    return port
  }
}

interface DockerHostContainerState {
  id: string
  image: string
  labels: Record<string, string>
  state: 'running' | 'exited' | 'paused' | 'created' | 'unknown'
  createdAt: string
  profileId?: string
  profileHash?: string
}

interface DockerHostState {
  id: string
  description: string
  connection: ConnectionTestResult
  resources?: DockerHostResources
  containers: DockerHostContainerState[]
  containersError?: string
}

type DockerJobResult =
  | {
      success: true
      jobId: string
      result: JsonSerializableObject
      timing: Record<string, number>
    }
  | {
      success: false
      jobId: string
      error: { code: string; message: string }
      timing: Record<string, number>
    }

interface DockerSubmitResult {
  jobId: string
}

interface DockerJobState {
  job_id: string
  job_class: string
  status: 'pending' | 'running' | 'success' | 'failed'
  error?: string
  started_at?: string
  completed_at?: string
  worker_kind: string
  worker_state_pid?: number
}
type DockerJobResultAgent =
  | {
      success: true
      job_id: string
      result: JsonSerializableObject
      timing: Record<string, number>
    }
  | {
      success: false
      job_id: string
      error: { code: string; message: string }
      timing: Record<string, number>
    }

type DockerExecResult<T extends boolean> = T extends true
  ? DockerJobResult
  : DockerSubmitResult
