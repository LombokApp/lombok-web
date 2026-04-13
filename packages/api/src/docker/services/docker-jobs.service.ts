import type {
  ContainerProfileConfig,
  ContainerTarget,
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
import { dataFromTemplate } from 'src/core/utils/data-template.util'
import { buildPlatformOrigin } from 'src/core/utils/platform-origin.util'
import { waitForCondition } from 'src/core/utils/wait.util'
import { OrmService } from 'src/orm/orm.service'

import {
  type ContainerCreateOptions,
  DockerExecuteJobOptions,
  JobExecuteOptions,
} from './client/docker.schema'
import { DockerClientService } from './client/docker-client.service'
import {
  ConnectionTestResult,
  DockerHostResources,
  DockerLogAccessError,
  DockerLogEntry,
} from './client/docker-client.types'
import { DockerHostManagementService } from './docker-host-management.service'
import { DockerWorkerHookService } from './docker-worker-hook.service'

const DEFAULT_WAIT_FOR_COMPLETION_OPTIONS = {
  maxRetries: 100,
  retryPeriodMs: 250,
}

/** Labels applied to worker containers for discovery */
export const DOCKER_LABELS = {
  PLATFORM_HOST: 'lombok.platform_host',
  PLATFORM_URL: 'lombok.platform_url',
  PROFILE_ID: 'lombok.container_profile_id',
  PROFILE_HASH: 'lombok.container_profile_hash',
  APP_ID: 'lombok.container_app_id',
  USER_ID: 'lombok.container_user_id',
  IMAGE: 'lombok.container_image',
  ISOLATION_KEY: 'lombok.container_isolation_key',
} as const

@Injectable({ scope: Scope.DEFAULT })
export class DockerJobsService {
  private readonly logger = new Logger(DockerJobsService.name)
  dockerWorkerHookService: DockerWorkerHookService
  dockerClientService: DockerClientService
  constructor(
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => DockerClientService)) _dockerClientService,
    @Inject(forwardRef(() => DockerWorkerHookService))
    _dockerWorkerHookService,
    private readonly dockerHostManagementService: DockerHostManagementService,
  ) {
    this.dockerWorkerHookService =
      _dockerWorkerHookService as DockerWorkerHookService
    this.dockerClientService = _dockerClientService as DockerClientService
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

    // Find job-level containerTarget for inheritance merge
    let jobContainerTarget: ContainerTarget | undefined
    if (workerDefinition.kind === 'exec') {
      jobContainerTarget = workerDefinition.containerTarget ?? undefined
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const jobDef = workerDefinition.jobs.find(
        (job) => job.identifier === jobIdentifier,
      )!
      jobContainerTarget = jobDef.containerTarget ?? undefined
    }

    // Job overrides profile (defined overrides, undefined inherits)
    const resolvedContainerTarget =
      jobContainerTarget ?? profileSpec.containerTarget

    if (workerDefinition.kind === 'exec') {
      return { ...workerDefinition, resolvedContainerTarget }
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const jobDefinition = workerDefinition.jobs.find(
      (job) => job.identifier === jobIdentifier,
    )!

    return {
      jobIdentifier: jobDefinition.identifier,
      command: workerDefinition.command,
      kind: workerDefinition.kind,
      port: workerDefinition.port,
      resolvedContainerTarget,
    }
  }

  /**
   * Build container labels for worker discovery and identification
   */
  private buildContainerLabels(
    profileIdentifier: string,
    profileHash: string,
    image: string,
    appIdentifier?: string,
    userId?: string,
    isolationKey?: string,
  ): Record<string, string> {
    return {
      [DOCKER_LABELS.PLATFORM_HOST]: this._coreConfig.platformHost,
      [DOCKER_LABELS.PLATFORM_URL]: buildPlatformOrigin(this._coreConfig),
      [DOCKER_LABELS.PROFILE_HASH]: profileHash,
      [DOCKER_LABELS.IMAGE]: image,
      [DOCKER_LABELS.PROFILE_ID]: profileIdentifier,
      ...(appIdentifier ? { [DOCKER_LABELS.APP_ID]: appIdentifier } : {}),
      ...(userId ? { [DOCKER_LABELS.USER_ID]: userId } : {}),
      ...(isolationKey ? { [DOCKER_LABELS.ISOLATION_KEY]: isolationKey } : {}),
    }
  }

  /**
   * Destroy containers matching the given criteria.
   * If containerId is provided, destroy that specific container.
   * If profileKey is provided, find all containers by labels and destroy them.
   */
  async destroyContainers(
    params:
      | { hostId: string; containerId: string }
      | {
          hostId: string
          profileKey: string
          appIdentifier: string
          profileSpec: ContainerProfileConfig
          userId?: string
          isolationKey?: string
        },
  ): Promise<number> {
    if ('containerId' in params) {
      try {
        await this.dockerClientService.removeContainer(
          params.hostId,
          params.containerId,
          { force: true },
        )
        return 1
      } catch {
        return 0
      }
    }

    const {
      hostId,
      profileKey,
      appIdentifier,
      profileSpec,
      userId,
      isolationKey,
    } = params
    const profileHash = this.hashProfileSpec(profileSpec)
    const containerProfileIdentifier = `lombok:profile_${profileKey}`
    const labels = this.buildContainerLabels(
      containerProfileIdentifier,
      profileHash,
      profileSpec.image,
      appIdentifier,
      userId,
      isolationKey,
    )

    const containers = await this.dockerClientService.listContainersByLabels(
      hostId,
      labels,
    )

    let destroyedCount = 0
    for (const container of containers) {
      try {
        await this.dockerClientService.removeContainer(hostId, container.id, {
          force: true,
        })
        destroyedCount++
      } catch {
        this.logger.warn(
          `Failed to remove container ${container.id} on host ${hostId}`,
        )
      }
    }
    return destroyedCount
  }

  /**
   * Resolve Docker host configuration for a given profile key.
   * Uses the DB-backed resolution via DockerHostManagementService.
   */
  async resolveDockerHostConfigForProfile(profileKey: string): Promise<{
    hostId: string
    volumes: string[] | undefined
    env: Record<string, string> | undefined
    gpus: { driver: string; deviceIds: string[] } | undefined
    extraHosts: string[] | undefined
    networkMode: 'host' | 'bridge' | `container:${string}` | undefined
    capAdd: string[] | undefined
    securityOpt: string[] | undefined
  }> {
    const [appIdentifier, profileName] = profileKey.split(':')
    if (!appIdentifier || !profileName) {
      throw new AsyncWorkError({
        name: 'DockerClientError',
        origin: 'internal',
        code: 'DOCKER_NOT_CONFIGURED',
        message: `Invalid profile key "${profileKey}" — expected "appIdentifier:profileName"`,
      })
    }

    const resolved =
      await this.dockerHostManagementService.resolveProfileConfig(
        appIdentifier,
        profileName,
      )

    const rc = resolved.resourceConfig
    return {
      hostId: resolved.hostId,
      env: rc?.env ?? undefined,
      volumes: rc?.volumes ?? undefined,
      gpus: rc?.gpus ?? undefined,
      extraHosts: rc?.extraHosts ?? undefined,
      networkMode: rc?.networkMode as
        | 'host'
        | 'bridge'
        | `container:${string}`
        | undefined,
      capAdd: rc?.capAdd ?? undefined,
      securityOpt: rc?.securityOpt ?? undefined,
    }
  }

  /**
   * Resolve (find or create) a profile container and ensure it is running.
   * When a container is created via the profile path, provisions it with
   * platform credentials via the `provision` command if params are provided.
   */
  async resolveContainer(
    attributes:
      | { profileKey: string }
      | { containerId: string; hostId: string },
    { image, labels, env: extraEnv }: ContainerCreateOptions,
    provision?: {
      provisionSecret: string
      appIdentifier: string
      profileKey: string
      userId?: string
    },
  ): Promise<{ containerId: string; hostId: string }> {
    if ('containerId' in attributes) {
      const { hostId, containerId: refContainerId } = attributes

      const host = await this.dockerHostManagementService.getHost(hostId)
      if (!host || !host.enabled) {
        throw new AsyncWorkError({
          name: 'DockerClientError',
          origin: 'internal',
          code: 'DOCKER_NOT_CONFIGURED',
          message: `Unrecognized Docker host "${hostId}" for container "${refContainerId}"`,
        })
      }

      const container = await this.dockerClientService.findContainerById(
        hostId,
        refContainerId,
        { startIfNotRunning: true },
      )
      if (!container) {
        throw new AsyncWorkError({
          name: 'DockerClientError',
          origin: 'internal',
          code: 'CONTAINER_NOT_FOUND',
          message: `Container "${refContainerId}" not found on host "${hostId}"`,
        })
      }
      return { hostId, containerId: container.id }
    }

    // Profile path: resolve host config, find or create container
    const { hostId, ...config } =
      await this.resolveDockerHostConfigForProfile(attributes.profileKey)

    const container = await this.dockerClientService.findOrCreateContainer(
      hostId,
      {
        image,
        labels,
        startIfNotRunning: true,
        ...config,
        env: { ...config.env, ...extraEnv },
      },
    )

    if (!container) {
      throw new AsyncWorkError({
        name: 'DockerClientError',
        origin: 'internal',
        code: 'CONTAINER_NOT_FOUND',
        message: 'Container not found after findOrCreateContainer call',
      })
    }

    const containerId = container.id

    // Provision the container with platform credentials (container token)
    if (provision) {
      const containerToken =
        this.dockerWorkerHookService.createDockerContainerToken({
          appIdentifier: provision.appIdentifier,
          profileKey: provision.profileKey,
          hostId,
          containerId,
          userId: provision.userId,
        })

      const platformUrl = buildPlatformOrigin(this._coreConfig)

      const provisionExec = await this.dockerClientService.execInContainer(
        hostId,
        containerId,
        [
          'lombok-worker-agent',
          'provision',
          '--secret',
          provision.provisionSecret,
          `LOMBOK_CONTAINER_TOKEN=${containerToken}`,
          `LOMBOK_PLATFORM_URL=${platformUrl}`,
        ],
      )

      if (provisionExec.exitCode !== 0) {
        throw new AsyncWorkError({
          name: 'ProvisionError',
          origin: 'internal',
          message: `Failed to provision container: exit=${provisionExec.exitCode} stdout=${provisionExec.stdout} stderr=${provisionExec.stderr}`,
          code: 'PROVISION_FAILED',
          stack: new Error().stack,
          details: { containerId, hostId },
        })
      }
    }

    return { hostId, containerId }
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
      const startTime = performance.now()

      const {
        jobIdentifier,
        jobData,
        profileKey,
        profileSpec,
        appIdentifier,
        userId,
      } = params

      // generate a job id to represent this execution
      const jobId = crypto.randomUUID()

      // Generate a hash for the profile to track config drift
      const profileHash = this.hashProfileSpec(profileSpec)
      const jobDefinition = this.resolveProfileJobDefinition(
        profileSpec,
        jobIdentifier,
      )

      const containerProfileIdentifier = `lombok:profile_${profileKey}`

      const { resolvedContainerTarget } = jobDefinition

      // Generate a one-time secret for authenticating the provision exec call.
      const provisionSecret = crypto.randomUUID()

      let resolvedContainer: { containerId: string; hostId: string }

      if (resolvedContainerTarget?.type === 'instance') {
        // Instance path: resolve containerIdTemplate → direct container targeting
        const { containerId: resolvedContainerId } = await dataFromTemplate(
          { containerId: resolvedContainerTarget.containerIdTemplate },
          { objects: { inputData: jobData } },
        )

        if (!resolvedContainerId || typeof resolvedContainerId !== 'string') {
          throw new AsyncWorkError({
            name: 'DockerClientError',
            origin: 'internal',
            code: 'INVALID_CONTAINER_TARGET',
            message:
              'containerIdTemplate did not resolve to a valid container ID',
          })
        }

        const { hostId } =
          await this.resolveDockerHostConfigForProfile(profileKey)

        // If userIsolation, verify container's USER_ID label matches
        if (resolvedContainerTarget.userIsolation && userId) {
          const container = await this.dockerClientService.findContainerById(
            hostId,
            resolvedContainerId,
          )
          if (
            container?.labels[DOCKER_LABELS.USER_ID] &&
            container.labels[DOCKER_LABELS.USER_ID] !== userId
          ) {
            throw new AsyncWorkError({
              name: 'DockerClientError',
              origin: 'internal',
              code: 'CONTAINER_USER_MISMATCH',
              message: `Container "${resolvedContainerId}" does not belong to user "${userId}"`,
            })
          }
        }

        // Build labels for provisioning (not for matching)
        const labels = this.buildContainerLabels(
          containerProfileIdentifier,
          profileHash,
          profileSpec.image,
          appIdentifier,
          userId,
        )

        resolvedContainer = await this.resolveContainer(
          { containerId: resolvedContainerId, hostId },
          {
            image: profileSpec.image,
            labels,
            env: { LOMBOK_PROVISION_SECRET: provisionSecret },
          },
          { provisionSecret, appIdentifier, profileKey, userId },
        )
      } else if (resolvedContainerTarget?.type === 'class') {
        // Class path: compose isolation key, find-or-create container
        let isolationKey: string | undefined

        if (resolvedContainerTarget.isolationKeyTemplate) {
          const { isolationKey: resolvedKey } = await dataFromTemplate(
            { isolationKey: resolvedContainerTarget.isolationKeyTemplate },
            { objects: { inputData: jobData } },
          )
          if (resolvedKey && typeof resolvedKey === 'string') {
            isolationKey = resolvedKey
          }
        }

        // Compose effective isolation key with optional user prefix
        if (resolvedContainerTarget.userIsolation && userId) {
          isolationKey = isolationKey
            ? `user:${userId}:${isolationKey}`
            : `user:${userId}`
        }

        const effectiveUserId = resolvedContainerTarget.userIsolation
          ? userId
          : undefined

        const labels = this.buildContainerLabels(
          containerProfileIdentifier,
          profileHash,
          profileSpec.image,
          appIdentifier,
          effectiveUserId,
          isolationKey,
        )

        resolvedContainer = await this.resolveContainer(
          { profileKey },
          {
            image: profileSpec.image,
            labels,
            env: { LOMBOK_PROVISION_SECRET: provisionSecret },
          },
          {
            provisionSecret,
            appIdentifier,
            profileKey,
            userId: effectiveUserId,
          },
        )
      } else {
        // No containerTarget — shared container per profile (backward-compatible default)
        const labels = this.buildContainerLabels(
          containerProfileIdentifier,
          profileHash,
          profileSpec.image,
          appIdentifier,
          userId,
        )

        resolvedContainer = await this.resolveContainer(
          { profileKey },
          {
            image: profileSpec.image,
            labels,
            env: { LOMBOK_PROVISION_SECRET: provisionSecret },
          },
          { provisionSecret, appIdentifier, profileKey, userId },
        )
      }

      const { hostId, containerId } = resolvedContainer

      // 2. Execute the job
      const jobToken = this.dockerWorkerHookService.createDockerWorkerJobToken({
        jobId,
        ...(params.asyncTaskId ? { taskId: params.asyncTaskId } : {}),
        storageAccessPolicy: params.storageAccessPolicy ?? {
          rules: [],
        },
        executorMetadata: {
          profileKey,
          profileHash,
          jobIdentifier,
          containerId,
          hostId,
        },
      })

      const jobExecuteOptions: JobExecuteOptions = {
        job_id: jobId,
        job_class: jobIdentifier,
        job_input: jobData,
        // Only include job_token + platform_url when there's a platform-side
        // task to track. Without a task, there's nothing to send lifecycle
        // signals to and no reason to issue presigned URLs.
        job_token: params.asyncTaskId ? jobToken : undefined,
        worker_command: jobDefinition.command,
        interface:
          jobDefinition.kind === 'http'
            ? {
                kind: 'persistent_http',
                port: jobDefinition.port,
              }
            : {
                kind: 'exec_per_job',
              },
        platform_url: params.asyncTaskId
          ? buildPlatformOrigin(this._coreConfig)
          : undefined,
        output_location: params.storageAccessPolicy?.outputLocation
          ? {
              folder_id: params.storageAccessPolicy.outputLocation.folderId,
              ...('prefix' in params.storageAccessPolicy.outputLocation
                ? {
                    prefix: params.storageAccessPolicy.outputLocation.prefix,
                  }
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

      const payloadBase64 = Buffer.from(
        JSON.stringify(jobExecuteOptions),
      ).toString('base64')

      const startJobExec = await this.dockerClientService.execInContainer(
        hostId,
        containerId,
        ['lombok-worker-agent', 'run-job', `--payload-base64=${payloadBase64}`],
      )

      if (startJobExec.exitCode !== 0) {
        this.logger.debug(
          `Job ${jobId} submission failed:\n${startJobExec.stderr}.`,
        )
        throw new AsyncWorkError({
          name: 'DockerJobSubmissionError',
          origin: 'internal',
          code: 'JOB_SUBMISSION_FAILED',
          message: startJobExec.stderr || `Job ${jobId} submission failed`,
          stack: new Error().stack,
        })
      }

      if (waitForCompletion) {
        const completionResult = await this.waitForCompletion(
          hostId,
          containerId,
          jobId,
        )
        this.logger.debug(
          `Job ${jobId} completed in ${(performance.now() - startTime).toFixed(0)}ms total`,
        )
        return {
          ...completionResult,
          containerId,
        }
      } else {
        const submitResult: DockerSubmitResult = {
          jobId,
          containerId,
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

    await waitForCondition(
      async () => {
        currentJobState = await latestState()
        return hasCompleted()
      },
      'Job completion timed out',
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

    const exec = await this.dockerClientService.execInContainer(
      hostId,
      containerId,
      command,
    )

    if (exec.stderr.length > 0) {
      throw new DockerLogAccessError(
        'AGENT_LOG_ACCESS_ERROR',
        'Error getting agent log: ' + exec.stderr,
      )
    }
    return exec.stdout
  }

  private async getJobState(
    hostId: string,
    containerId: string,
    jobId: string,
  ): Promise<DockerJobState> {
    const command = ['lombok-worker-agent', 'job-state', '--job-id', jobId]

    const exec = await this.dockerClientService.execInContainer(
      hostId,
      containerId,
      command,
    )

    if (exec.exitCode !== 0) {
      throw new AsyncWorkError({
        name: 'DockerWorkerStateError',
        origin: 'internal',
        code: 'GET_JOB_STATE_FAILED',
        message: 'Failed to get job state: ' + exec.stderr,
      })
    }

    if (exec.stdout.length === 0) {
      throw new AsyncWorkError({
        name: 'DockerWorkerStateError',
        origin: 'internal',
        code: 'JOB_STATE_NOT_FOUND',
        message:
          'Job state not found\nError: ' + exec.stderr + '\n' + exec.stderr,
      })
    }

    return JSON.parse(exec.stdout) as DockerJobState
  }

  private async getJobResult(
    hostId: string,
    containerId: string,
    jobId: string,
  ): Promise<DockerJobResult> {
    const command = ['lombok-worker-agent', 'job-result', '--job-id', jobId]

    const exec = await this.dockerClientService.execInContainer(
      hostId,
      containerId,
      command,
    )

    const agentResponse =
      exec.stdout.length > 0
        ? (JSON.parse(exec.stdout) as DockerJobResultAgent)
        : undefined

    return agentResponse
      ? {
          ...agentResponse,
          jobId: agentResponse.job_id,
          containerId,
        }
      : {
          success: false,
          jobId,
          error: {
            code: 'JOB_RESULT_NOT_FOUND',
            message: 'Job result not found\nError: ' + exec.stderr,
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

    const exec = await this.dockerClientService.execInContainer(
      hostId,
      containerId,
      command,
    )

    if (exec.stderr.length > 0) {
      throw new DockerLogAccessError(
        'JOB_LOG_ACCESS_ERROR',
        'Error getting job log: ' + exec.stderr,
      )
    }
    return exec.stdout
  }

  async listContainerJobStateFiles(
    hostId: string,
    containerId: string,
  ): Promise<string[]> {
    const exec = await this.dockerClientService.execInContainer(
      hostId,
      containerId,
      [
        'sh',
        '-c',
        'ls -1t /var/lib/lombok-worker-agent/jobs/*.json 2>/dev/null || true',
      ],
    )

    return exec.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  }

  async listContainerWorkerStateFiles(
    hostId: string,
    containerId: string,
  ): Promise<string[]> {
    const exec = await this.dockerClientService.execInContainer(
      hostId,
      containerId,
      [
        'sh',
        '-c',
        'ls -1t /var/lib/lombok-worker-agent/workers/http_*.json 2>/dev/null || true',
      ],
    )

    return exec.stdout
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

    const exec = await this.dockerClientService.execInContainer(
      hostId,
      containerId,
      [
        'sh',
        '-c',
        `ls -1t /var/lib/lombok-worker-agent/worker-jobs/${safeWorkerId}/*.json 2>/dev/null || true`,
      ],
    )

    return exec.stdout
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

    const exec = await this.dockerClientService.execInContainer(
      hostId,
      containerId,
      command,
    )

    if (exec.exitCode !== 0) {
      throw new AsyncWorkError({
        name: 'DockerWorkerStateError',
        origin: 'internal',
        code: 'GET_WORKER_STATE_FAILED',
        message: 'Failed to get worker state: ' + exec.stderr,
      })
    }

    if (exec.stdout.length === 0) {
      throw new AsyncWorkError({
        name: 'DockerWorkerStateError',
        origin: 'internal',
        code: 'WORKER_STATE_NOT_FOUND',
        message:
          'Worker state not found\nError: ' + exec.stderr + '\n' + exec.stderr,
      })
    }

    return JSON.parse(exec.stdout)
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

    const exec = await this.dockerClientService.execInContainer(
      hostId,
      containerId,
      command,
    )

    if (exec.exitCode !== 0) {
      throw new AsyncWorkError({
        name: 'DockerWorkerError',
        origin: 'internal',
        code: 'PURGE_JOBS_FAILED',
        message: 'Failed to purge jobs: ' + exec.stderr,
      })
    }

    if (exec.stderr.length > 0) {
      throw new DockerLogAccessError(
        'PURGE_JOBS_ERROR',
        'Error purging job files: ' + exec.stderr,
      )
    }

    return { message: exec.stdout.trim() || 'Purge completed.' }
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
          [DOCKER_LABELS.PLATFORM_HOST]: this._coreConfig.platformHost,
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
    const hosts = await this.dockerHostManagementService.listHosts()
    const enabledHostIds = hosts.filter((h) => h.enabled).map((h) => h.id)
    return Promise.all(
      enabledHostIds.map((hostId) => this.getDockerHostState(hostId)),
    )
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
      containerId: string
      result: JsonSerializableObject
      timing: Record<string, number>
    }
  | {
      success: false
      jobId: string
      containerId?: string
      error: { code: string; message: string }
      timing: Record<string, number>
    }

interface DockerSubmitResult {
  jobId: string
  containerId: string
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
