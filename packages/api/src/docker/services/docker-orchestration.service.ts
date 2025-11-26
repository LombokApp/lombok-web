import type { ContainerProfileConfig } from '@lombokapp/types'
import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { eq } from 'drizzle-orm'
import { appsTable } from 'src/app/entities/app.entity'
import { Event } from 'src/event/entities/event.entity'
import { OrmService } from 'src/orm/orm.service'
import { platformConfig } from 'src/platform/config'
import { Task } from 'src/task/entities/task.entity'

import { LocalDockerAdapter } from './adapters/local.adapter'
import { DockerManager } from './docker-manager.service'

export const USER_JWT_SUB_PREFIX = 'user:'
export const APP_USER_JWT_SUB_PREFIX = 'app_user:'
export const APP_JWT_SUB_PREFIX = 'app:'
export const APP_WORKER_JWT_SUB_PREFIX = 'app_worker:'

/** Labels applied to worker containers for discovery */
export const DOCKER_LABELS = {
  PLATFORM: 'lombok.platform',
  PROFILE_ID: 'lombok.profile_id',
  PROFILE_HASH: 'lombok.profile_hash',
  APP_IDENTIFIER: 'lombok.app_identifier',
  WORKER_ROLE: 'lombok.worker_role',
} as const

export interface SyncDockerJobParams {
  appIdentifier: string
  profileName: string
  jobClass: string
  eventContext: {
    eventId: string
    data: unknown
  }
}

export interface SyncDockerJobResult {
  success: boolean
  result?: unknown
  error?: {
    code: string
    message: string
  }
}

@Injectable({ scope: Scope.DEFAULT })
export class DockerOrchestrationService {
  private readonly dockerManager: DockerManager
  constructor(
    @Inject(platformConfig.KEY)
    private readonly _platformConfig: nestjsConfig.ConfigType<
      typeof platformConfig
    >,
    private readonly ormService: OrmService,
  ) {
    this.dockerManager = new DockerManager({
      ...(this._platformConfig.dockerHost && {
        local: new LocalDockerAdapter(this._platformConfig.dockerHost),
      }),
    })

    void this.dockerManager.ping('local').then((result) => {
      console.log('Docker host ping result:', result)
    })
  }

  /**
   * Get the profile spec for a given app and profile name
   */
  private async getProfileSpec(
    appIdentifier: string,
    profileName: string,
  ): Promise<ContainerProfileConfig> {
    const app = await this.ormService.db.query.appsTable.findFirst({
      where: eq(appsTable.identifier, appIdentifier),
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
   * Validate that the job class exists in the profile spec
   */
  private validateJobClass(
    profileSpec: ContainerProfileConfig,
    jobClass: string,
  ): void {
    if (!(jobClass in profileSpec.jobClasses)) {
      const availableJobClasses = Object.keys(profileSpec.jobClasses)
      throw new NotFoundException(
        `Job class "${jobClass}" not found. Available: ${availableJobClasses.join(', ') || '(none)'}`,
      )
    }
  }

  /**
   * Build container labels for worker discovery and identification
   */
  private buildContainerLabels(
    appIdentifier: string,
    profileName: string,
    profileHash: string,
  ): Record<string, string> {
    return {
      [DOCKER_LABELS.PLATFORM]: 'lombok',
      [DOCKER_LABELS.APP_IDENTIFIER]: appIdentifier,
      [DOCKER_LABELS.PROFILE_ID]: profileName,
      [DOCKER_LABELS.PROFILE_HASH]: profileHash,
      [DOCKER_LABELS.WORKER_ROLE]: 'worker',
    }
  }

  /**
   * Execute a synchronous docker job.
   *
   * This method:
   * 1. Looks up the app's container profile
   * 2. Validates the job class exists
   * 3. Finds or creates a suitable container
   * 4. Executes the job via docker exec
   * 5. Returns the result
   */
  async executeSyncDockerJob(
    params: SyncDockerJobParams,
  ): Promise<SyncDockerJobResult> {
    const { appIdentifier, profileName, jobClass, eventContext } = params

    // Get the profile spec for this app
    const profileSpec = await this.getProfileSpec(appIdentifier, profileName)

    // Validate the job class exists
    this.validateJobClass(profileSpec, jobClass)

    // Generate a hash for the profile to track config drift
    const profileHash = this.hashProfileSpec(profileSpec)

    // Build labels for container discovery
    const labels = this.buildContainerLabels(
      appIdentifier,
      profileName,
      profileHash,
    )

    // Get the default host (local for now)
    const hostId = 'local'

    // Check if docker host is configured
    if (!this._platformConfig.dockerHost) {
      return {
        success: false,
        error: {
          code: 'DOCKER_NOT_CONFIGURED',
          message: 'Docker host is not configured',
        },
      }
    }

    // Find an existing container or create a new one
    const container = await this.dockerManager.findOrCreateContainer(hostId, {
      image: profileSpec.image,
      command: profileSpec.command,
      environmentVariables: profileSpec.environmentVariables,
      labels,
      profileName,
      appIdentifier,
    })

    if (!container) {
      return {
        success: false,
        error: {
          code: 'CONTAINER_CREATE_FAILED',
          message: 'Failed to find or create a container for this job',
        },
      }
    }

    // Execute the job in the container via docker exec
    const execResult = await this.dockerManager.execInContainer(
      hostId,
      container.id,
      {
        mode: 'sync',
        jobClass,
        payload: eventContext,
      },
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

  async executeDockerJobAsync(
    task: Task,
    event: Event & {
      data: { appIdentifier: string; profile: string; jobClass: string }
    },
  ) {
    // handlerIdentifier contains "profile:jobClass" for docker tasks
    if (!event.data.profile || !event.data.jobClass) {
      throw new Error('Docker task missing profile or jobClass')
    }

    const profileName = event.data.profile
    const jobClass = event.data.jobClass
    const appIdentifier = event.data.appIdentifier
    if (!profileName || !jobClass) {
      throw new Error(
        `Invalid handlerIdentifier format: "${task.handlerIdentifier}". Expected "profile:jobClass"`,
      )
    }

    // Get the profile spec for this app
    const profileSpec = await this.getProfileSpec(appIdentifier, profileName)

    // Validate the job class exists
    this.validateJobClass(profileSpec, jobClass)

    // Generate a hash for the profile to track config drift
    const profileHash = this.hashProfileSpec(profileSpec)

    // Build labels for container discovery
    const labels = this.buildContainerLabels(
      appIdentifier,
      profileName,
      profileHash,
    )

    // Get the default host (local for now)
    const hostId = 'local'

    // Check if docker host is configured
    if (!this._platformConfig.dockerHost) {
      throw new Error('Docker host is not configured')
    }

    // Find an existing container or create a new one
    const container = await this.dockerManager.findOrCreateContainer(hostId, {
      image: profileSpec.image,
      command: profileSpec.command,
      environmentVariables: profileSpec.environmentVariables,
      labels,
      profileName,
      appIdentifier,
    })

    if (!container) {
      throw new Error('Failed to find or create a container for this job')
    }

    // Execute the job in the container via docker exec
    const execResult = await this.dockerManager.execInContainer(
      hostId,
      container.id,
      {
        mode: 'async',
        jobClass,
        payload: {
          taskId: task.id,
          eventId: event.id,
          eventData: event.data,
          inputData: task.inputData,
        },
      },
    )

    if (!execResult.success) {
      throw new Error(
        `Docker job execution failed: ${execResult.error?.message ?? 'Unknown error'}`,
      )
    }
  }
}
