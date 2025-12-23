import type { ContainerProfileConfig } from '@lombokapp/types'
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

import { LocalDockerAdapter } from './client/adapters/local.adapter'
import { DockerExecuteJobOptions } from './client/docker.schema'
import { DockerClient } from './client/docker-client.service'
import { DockerExecResult } from './client/docker-client.types'
import { WorkerJobService } from './worker-job.service'

export const USER_JWT_SUB_PREFIX = 'user:'
export const APP_USER_JWT_SUB_PREFIX = 'app_user:'
export const APP_JWT_SUB_PREFIX = 'app:'
export const APP_WORKER_JWT_SUB_PREFIX = 'app_worker:'

/** Labels applied to worker containers for discovery */
export const DOCKER_LABELS = {
  PLATFORM: 'lombok.platform',
  PROFILE_ID: 'lombok.profile_id',
  PROFILE_HASH: 'lombok.profile_hash',
} as const

@Injectable({ scope: Scope.DEFAULT })
export class DockerJobsService {
  private readonly dockerClient: DockerClient
  private readonly logger = new Logger(DockerJobsService.name)
  constructor(
    @Inject(platformConfig.KEY)
    private readonly _platformConfig: nestjsConfig.ConfigType<
      typeof platformConfig
    >,
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => WorkerJobService))
    private readonly workerJobService: WorkerJobService,
  ) {
    this.dockerClient = new DockerClient({
      ...(this._platformConfig.dockerHostConfig &&
        Object.fromEntries(
          Object.entries(this._platformConfig.dockerHostConfig).map(
            ([key, value]) => [key, new LocalDockerAdapter(value.host)],
          ),
        )),
    })

    void this.dockerClient.testAllHostConnections().then((result) => {
      this.logger.debug('Docker host connection test result:', result)
    })
  }

  /**
   * Get the profile spec for a given app and profile name
   */
  async getProfileSpec(
    appIdentifier: string,
    profileName: string,
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

    if (!(profileName in app.containerProfiles)) {
      throw new NotFoundException(
        `Container profile "${profileName}" not found for app "${appIdentifier}"`,
      )
    }

    return app.containerProfiles[profileName]
  }

  /**
   * Validate that the job class exists in the profile spec and return it
   */
  resolveProfileJobDefinition(
    profileSpec: ContainerProfileConfig,
    jobName: string,
  ) {
    const workerDefinition = profileSpec.workers.find(
      (worker) =>
        (worker.kind === 'exec' && worker.jobName === jobName) ||
        (worker.kind === 'http' &&
          worker.jobs.find((job) => job.jobName === jobName)),
    )

    if (!workerDefinition) {
      const availableJobClasses = profileSpec.workers.flatMap((worker) =>
        worker.kind === 'exec'
          ? [worker.jobName]
          : worker.jobs.map((job) => job.jobName),
      )
      throw new NotFoundException(
        `Job class "${jobName}" not found. Available: ${availableJobClasses.join(', ') || '(none)'}`,
      )
    }
    if (workerDefinition.kind === 'exec') {
      return workerDefinition
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const jobDefinition = workerDefinition.jobs.find(
      (job) => job.jobName === jobName,
    )!

    return {
      jobName: jobDefinition.jobName,
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
    params: Omit<
      DockerExecuteJobOptions,
      'jobCommand' | 'jobInterface' | 'jobId' | 'jobToken'
    > & {
      taskId?: string
      storageAccess?: Record<string, string[]>
      waitForCompletion: T
    },
  ): Promise<DockerExecResult<T>> {
    const { jobName, jobInputData, volumes, gpus, hostConfigId, profileSpec } =
      params

    // generate a job id to represent this execution
    const jobId = crypto.randomUUID()

    // Generate a hash for the profile to track config drift
    const profileHash = this.hashProfileSpec(profileSpec)
    const jobDefinition = this.resolveProfileJobDefinition(profileSpec, jobName)

    const containerProfileIdentifier = `lombok:profile_hash_${profileHash}`
    // Build labels for container discovery

    const labels = this.buildContainerLabels(
      containerProfileIdentifier,
      profileHash,
    )

    // Get the default host (homelab for now)
    const hostId = 'homelab'

    // Check if docker host is configured
    if (!this._platformConfig.dockerHostConfig?.[hostId]) {
      throw new Error('DOCKER_NOT_CONFIGURED')
    }

    const hostConfig =
      hostId in this._platformConfig.dockerHostConfig
        ? this._platformConfig.dockerHostConfig[hostId]
        : {
            volumes: {} as Record<string, Record<string, string>>,
            gpus: {} as Record<string, string>,
          }

    // create the worker token if one is required
    const jobToken =
      params.taskId || Object.keys(params.storageAccess || {}).length > 0
        ? this.workerJobService.createWorkerJobToken({
            jobId,
            taskId: params.taskId,
            storageAccess: params.storageAccess || {},
          })
        : undefined

    // Find an existing container or create a new one
    const container = await this.dockerClient.findOrCreateContainer(hostId, {
      image: profileSpec.image,
      labels,
      containerProfileIdentifier,
      volumes:
        'volumes' in hostConfig
          ? hostConfig.volumes?.[hostConfigId]
          : undefined,
      gpus: this._platformConfig.dockerHostConfig[hostId].gpus?.[hostConfigId],
    })

    if (!container) {
      throw new Error('CONTAINER_CREATE_FAILED')
    }

    // Execute the job in the container via docker exec
    const execOptions: DockerExecuteJobOptions & { waitForCompletion: T } = {
      waitForCompletion: params.waitForCompletion,
      hostConfigId,
      profileSpec,
      jobId,
      jobToken,
      jobName,
      jobInputData,
      jobCommand: jobDefinition.command,
      jobInterface:
        jobDefinition.kind === 'http'
          ? {
              kind: 'persistent_http',
              listener: {
                type: 'tcp',
                port: jobDefinition.port,
              },
            }
          : {
              kind: 'exec_per_job',
            },
      volumes,
      gpus,
    }

    const execResult = await this.dockerClient.execInContainer<T>(
      hostId,
      container.id,
      execOptions,
    )

    return execResult
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
}
