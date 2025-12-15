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

import {
  ContainerWorkerExecuteOptions,
  DockerExecuteJobOptions,
} from './client/docker.schema'
import { DockerClientService } from './client/docker-client.service'
import { DockerExecResult } from './client/docker-client.types'
import { WorkerJobService } from './worker-job.service'

export const APP_WORKER_JWT_SUB_PREFIX = 'app_worker:'

/** Labels applied to worker containers for discovery */
export const DOCKER_LABELS = {
  PLATFORM: 'lombok.platform',
  PROFILE_ID: 'lombok.profile_id',
  PROFILE_HASH: 'lombok.profile_hash',
} as const

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
  ): Promise<DockerExecResult<T>> {
    const {
      jobIdentifier,
      jobData,
      profileHostConfigKey,
      profileSpec,
      outputLocation,
    } = params

    // generate a job id to represent this execution
    const jobId = crypto.randomUUID()

    // Generate a hash for the profile to track config drift
    const profileHash = this.hashProfileSpec(profileSpec)
    const jobDefinition = this.resolveProfileJobDefinition(
      profileSpec,
      jobIdentifier,
    )

    const containerProfileIdentifier = `lombok:profile_hash_${profileHash}`
    // Build labels for container discovery

    const labels = this.buildContainerLabels(
      containerProfileIdentifier,
      profileHash,
    )

    // Get the default host (local for now)
    const hostId = 'local'

    // Check if docker host is configured
    if (!(hostId in this._platformConfig.dockerHostConfig)) {
      throw new Error('DOCKER_NOT_CONFIGURED')
    }

    const { gpus = undefined, volumes = undefined } =
      hostId in this._platformConfig.dockerHostConfig
        ? {
            volumes:
              this._platformConfig.dockerHostConfig[hostId].volumes?.[
                profileHostConfigKey
              ],
            gpus: this._platformConfig.dockerHostConfig[hostId].gpus?.[
              profileHostConfigKey
            ],
          }
        : {}

    // create the worker token if one is required
    const jobToken =
      params.asyncTaskId || (params.storageAccessPolicy ?? []).length > 0
        ? this.workerJobService.createWorkerJobToken({
            jobId,
            ...(params.asyncTaskId ? { taskId: params.asyncTaskId } : {}),
            storageAccessPolicy: params.storageAccessPolicy,
            executorContext: {
              profileKey: profileHostConfigKey,
              profileHash,
              jobIdentifier,
            },
          })
        : undefined

    // Find an existing container or create a new one
    const container = await this.dockerClientService.findOrCreateContainer(
      hostId,
      {
        image: profileSpec.image,
        labels,
        volumes,
        gpus,
      },
    )

    if (!container) {
      throw new Error('CONTAINER_CREATE_FAILED')
    }

    // Execute the job in the container via docker exec
    const execOptions: ContainerWorkerExecuteOptions<T> = {
      waitForCompletion: !params.asyncTaskId as T,
      jobId,
      jobToken,
      jobIdentifier,
      jobData,
      platformURL: `http${this._platformConfig.platformHttps ? 's' : ''}://${this._platformConfig.platformHost}${this._platformConfig.platformPort !== null ? `:${this._platformConfig.platformPort}` : ''}`,
      outputLocation,
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

    const execResult = await this.dockerClientService.execInContainer<T>(
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
