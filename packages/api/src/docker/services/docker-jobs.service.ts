import type {
  ContainerProfileConfig,
  JsonSerializableObject,
} from '@lombokapp/types'
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
import { OrmService } from 'src/orm/orm.service'
import { platformConfig } from 'src/platform/config'
import { waitForTrue, WaitForTrueError } from 'src/platform/utils/wait.util'

import {
  DockerExecuteJobOptions,
  JobExecuteOptions,
} from './client/docker.schema'
import { DockerClientService } from './client/docker-client.service'
import { DockerExecState, DockerStateFunc } from './client/docker-client.types'
import { WorkerJobService } from './worker-job.service'

const DEFAULT_WAIT_FOR_SUBMISSION_OPTIONS = {
  maxRetries: 50,
  retryPeriod: 250,
}

const DEFAULT_WAIT_FOR_COMPLETION_OPTIONS = {
  maxRetries: 100,
  retryPeriod: 250,
}

/** Labels applied to worker containers for discovery */
export const DOCKER_LABELS = {
  PLATFORM: 'lombok.platform',
  PROFILE_ID: 'lombok.profile_id',
  PROFILE_HASH: 'lombok.profile_hash',
} as const

export class DockerJobSubmissionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'DockerJobSubmissionError'
  }
}

export class DockerJobCompletionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'DockerJobCompletionError'
  }
}

@Injectable({ scope: Scope.DEFAULT })
export class DockerJobsService {
  private readonly logger = new Logger(DockerJobsService.name)
  constructor(
    @Inject(platformConfig.KEY)
    private readonly _platformConfig: nestjsConfig.ConfigType<
      typeof platformConfig
    >,
    private readonly ormService: OrmService,
    private readonly dockerClientService: DockerClientService,
    @Inject(forwardRef(() => WorkerJobService))
    private readonly workerJobService: WorkerJobService,
  ) {
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
  resolveProfileJobDefinition(
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
    const { jobIdentifier, jobData, profileKey, profileSpec, outputLocation } =
      params

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
      params.asyncTaskId || (params.storageAccessPolicy ?? []).length > 0
        ? this.workerJobService.createWorkerJobToken({
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

    try {
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
          : `http${this._platformConfig.platformHttps ? 's' : ''}://${this._platformConfig.platformHost}${this._platformConfig.platformPort !== null ? `:${this._platformConfig.platformPort}` : ''}`,
        output_location: outputLocation,
      }

      this.logger.log('Executing job:', jobExecuteOptions)

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

      const { hostId, containerId, state, output } =
        await this.dockerClientService.execInProfileContainer(profileKey, {
          image: profileSpec.image,
          command: agentCommand,
          labels,
        })

      // Wait for the agent exec call to complete, signifying that the job has been submitted
      try {
        await this.waitForSubmission(state, output)
      } catch (error) {
        if (error instanceof DockerJobSubmissionError) {
          const submitErrorResult: DockerSubmitResult = {
            jobId,
            submitError: {
              code: error.code,
              message: error.message,
            },
          }
          this.logger.warn(
            'Submission failed. Agent logs:',
            await this.getAgentLogs(hostId, containerId),
            'Worker logs:',
            await this.getWorkerLogs(hostId, containerId, {
              jobClass: jobIdentifier,
            }),
            'Job state:',
            await this.getJobState(hostId, containerId, jobId),
          )
          return submitErrorResult as DockerExecResult<T>
        }
        throw error
      }

      this.logger.debug('Job submission output:', {
        output: await output(),
        state: await state(),
      })

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
      this.logger.error('error:', error)
      throw error
    }
  }

  /**
   * Generate a simple hash for the profile spec to detect config drift
   */
  private hashProfileSpec(profileSpec: ContainerProfileConfig): string {
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

  async waitForSubmission(
    state: DockerStateFunc,
    output: () => Promise<{ stdout: string; stderr: string }>,
    {
      maxRetries = DEFAULT_WAIT_FOR_SUBMISSION_OPTIONS.maxRetries,
      retryPeriod = DEFAULT_WAIT_FOR_SUBMISSION_OPTIONS.retryPeriod,
    }: {
      maxRetries?: number
      retryPeriod?: number
    } = DEFAULT_WAIT_FOR_SUBMISSION_OPTIONS,
  ) {
    let currentState: DockerExecState = await state()
    try {
      await waitForTrue(
        async () => {
          currentState = await state()
          if (
            !currentState.running &&
            typeof currentState.exitCode !== 'number'
          ) {
            throw new DockerJobSubmissionError(
              'SUBMISSION_ERROR',
              `Job submission completed but without exit code. This should never happen.`,
            )
          }
          return !currentState.running
        },
        { maxRetries, retryPeriod },
      )
    } catch (error) {
      if (!(error instanceof WaitForTrueError)) {
        throw new DockerJobSubmissionError(
          'UNKNOWN_ERROR',
          `Job submission failed with unknown error: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
      this.logger.warn('Docker job WaitForSubmission timeout')
    }

    if (currentState.running) {
      throw new DockerJobSubmissionError(
        'SUBMISSION_TIMEOUT',
        `Job is still submitting after approximately ${maxRetries * retryPeriod}ms`,
      )
    } else if (currentState.exitCode !== 0) {
      const _output = await output()
      throw new DockerJobSubmissionError(
        'SUBMISSION_ERROR',
        `Job submission failed with exit code ${currentState.exitCode}.\nOutput: ${_output.stdout}\nError: ${_output.stderr}`,
      )
    }
  }

  async waitForCompletion(
    hostId: string,
    containerId: string,
    jobId: string,
    {
      maxRetries = DEFAULT_WAIT_FOR_COMPLETION_OPTIONS.maxRetries,
      retryPeriod = DEFAULT_WAIT_FOR_COMPLETION_OPTIONS.retryPeriod,
    }: {
      maxRetries?: number
      retryPeriod?: number
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
      { maxRetries, retryPeriod },
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
    throw new DockerJobCompletionError(
      'COMPLETION_TIMEOUT',
      `Job is not completed after approximately ${maxRetries * retryPeriod}ms`,
    )
  }

  async getAgentLogs(
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

    const output =
      await this.dockerClientService.execInContainerAndReturnOutput(
        hostId,
        containerId,
        command,
      )
    if (output.stderr.length > 0) {
      throw new DockerJobCompletionError(
        'AGENT_LOG_ERROR',
        'Error getting agent log: ' + output.stderr,
      )
    }
    return output.stdout
  }

  async getJobState(
    hostId: string,
    containerId: string,
    jobId: string,
  ): Promise<DockerJobState> {
    const command = ['lombok-worker-agent', 'job-state', '--job-id', jobId]

    const rawOutput =
      await this.dockerClientService.execInContainerAndReturnOutput(
        hostId,
        containerId,
        command,
      )

    if (rawOutput.stdout.length === 0) {
      throw new DockerJobCompletionError(
        'JOB_STATE_NOT_FOUND',
        'Job state not found\nError: ' + rawOutput.stderr,
      )
    }
    return JSON.parse(rawOutput.stdout) as DockerJobState
  }

  async getJobResult(
    hostId: string,
    containerId: string,
    jobId: string,
  ): Promise<DockerJobResult> {
    const command = ['lombok-worker-agent', 'job-result', '--job-id', jobId]

    const output =
      await this.dockerClientService.execInContainerAndReturnOutput(
        hostId,
        containerId,
        command,
      )

    const agentResponse =
      output.stdout.length > 0
        ? (JSON.parse(output.stdout) as DockerJobResultAgent)
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
            message: 'Job result not found\nError: ' + output.stderr,
          },
          timing: {},
        }
  }

  async getWorkerLogs(
    hostId: string,
    containerId: string,
    options: { jobClass: string; tail?: number; err?: boolean },
  ): Promise<string> {
    const command = [
      'lombok-worker-agent',
      'worker-log',
      '--job-class',
      options.jobClass,
    ]

    if (options.err) {
      command.push('--err')
    }

    if (options.tail) {
      command.push('--tail', options.tail.toString())
    }
    const output =
      await this.dockerClientService.execInContainerAndReturnOutput(
        hostId,
        containerId,
        command,
      )
    if (output.stdout.length === 0) {
      throw new DockerJobCompletionError(
        'WORKER_LOG_NOT_FOUND',
        'Worker log not found\nError: ' + output.stderr,
      )
    }
    return output.stdout
  }

  async getJobLogs(
    hostId: string,
    containerId: string,
    options: { jobId: string; tail?: number; err?: boolean },
  ): Promise<string> {
    const command = [
      'lombok-worker-agent',
      'job-log',
      '--job-id',
      options.jobId,
    ]

    if (options.err) {
      command.push('--err')
    }

    if (options.tail) {
      command.push('--tail', options.tail.toString())
    }

    const output =
      await this.dockerClientService.execInContainerAndReturnOutput(
        hostId,
        containerId,
        command,
      )
    if (output.stdout.length === 0) {
      throw new DockerJobCompletionError(
        'JOB_LOG_NOT_FOUND',
        'Job log not found\nError: ' + output.stderr,
      )
    }
    return output.stdout
  }
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

type DockerSubmitResult =
  | {
      jobId: string
    }
  | {
      jobId: string
      submitError: { code: string; message: string }
    }

interface DockerJobState {
  job_id: string
  job_class: string
  status: string
  started_at: string
  completed_at: string
  worker_kind: string
  worker_state_pid: number
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
