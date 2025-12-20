import { Inject, Injectable, Logger, Scope } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { platformConfig } from 'src/platform/config'

import { DockerAdapterProvider } from './adapters/docker-adapter.provider'
import type { ContainerCreateAndExecuteOptions } from './docker.schema'
import type {
  ConnectionTestResult,
  ContainerInfo,
  CreateContainerOptions,
  DockerAdapter,
  DockerStateFunc,
} from './docker-client.types'

@Injectable({ scope: Scope.DEFAULT })
export class DockerClientService {
  private readonly logger = new Logger(DockerClientService.name)
  private readonly dockerHostAdapters: Record<string, DockerAdapter> = {}

  constructor(
    private readonly dockerAdapterProvider: DockerAdapterProvider,
    @Inject(platformConfig.KEY)
    private readonly _platformConfig: nestjsConfig.ConfigType<
      typeof platformConfig
    >,
  ) {}

  /**
   * Get a docker adapter by host ID
   */
  private getAdapter(hostId: string): DockerAdapter {
    return this.dockerAdapterProvider.getDockerAdapter(hostId)
  }

  /**
   * Test connectivity to a Docker host
   */
  async testHostConnection(hostId: string): Promise<ConnectionTestResult> {
    return this.getAdapter(hostId).testConnection()
  }

  /**
   * Test connectivity to all Docker host
   */
  async testAllHostConnections(): Promise<
    Record<string, { result: ConnectionTestResult; id: string }>
  > {
    const results: Record<
      string,
      { result: ConnectionTestResult; id: string }
    > = {}
    for (const hostId of Object.keys(this.dockerHostAdapters)) {
      results[hostId] = {
        id: this.getAdapter(hostId).getDescription(),
        result: await this.getAdapter(hostId).testConnection(),
      }
    }
    return results
  }

  /**
   * List containers on a host matching the given labels
   */
  async listContainersByLabels(
    hostId: string,
    labels: Record<string, string>,
  ): Promise<ContainerInfo[]> {
    return this.getAdapter(hostId).listContainersByLabels(labels)
  }

  /**
   * Find an existing running container or create a new one
   * based on the given profile and labels
   */
  async findOrCreateContainer(
    hostId: string,
    options: CreateContainerOptions,
  ): Promise<ContainerInfo | null> {
    this.logger.debug('findOrCreateContainer:', { hostId, options })
    // TODO: Should this detect running container with non-matching host config (volumes, gpus, etc.)?
    const adapter = this.getAdapter(hostId)

    // Look for existing containers with matching labels
    const existingContainers = await adapter.listContainersByLabels(
      options.labels,
    )

    // Find a running container
    const runningContainer = existingContainers.find(
      (container) => container.state === 'running',
    )

    if (runningContainer) {
      return runningContainer
    }

    // Find a stopped container we can restart
    const stoppedContainer = existingContainers.find(
      (container) =>
        container.state === 'exited' || container.state === 'created',
    )

    if (stoppedContainer) {
      // Try to start the stopped container
      await adapter.startContainer(stoppedContainer.id)
      return {
        ...stoppedContainer,
        state: 'running',
      }
    }

    // No suitable container found, create a new one
    try {
      return await adapter.createContainer(options)
    } catch (error) {
      this.logger.error('Failed to create container:', error)
      return null
    }
  }

  async execInContainerAndReturnOutput(
    hostId: string,
    containerId: string,
    command: string[],
  ): Promise<string> {
    return this.getAdapter(hostId).execInContainerAndReturnOutput(
      containerId,
      command,
    )
  }

  /**
   * Find or create a container and execute a command
   */
  async execInProfileContainer(
    profileKey: string,
    { image, command, labels }: ContainerCreateAndExecuteOptions,
  ): Promise<{
    containerId: string
    hostId: string
    state: DockerStateFunc
    output: () => Promise<string>
  }> {
    // Get the default host (local for now)
    const hostId =
      this._platformConfig.dockerHostConfig.profileHostAssignments?.[
        profileKey
      ] ?? 'local'

    // Check if docker host is configured
    if (!(hostId in (this._platformConfig.dockerHostConfig.hosts ?? {}))) {
      throw new Error('DOCKER_NOT_CONFIGURED')
    }
    const adapter = this.getAdapter(hostId)

    const {
      gpus = undefined,
      volumes = undefined,
      networkMode = undefined,
      extraHosts = undefined,
    } = this._platformConfig.dockerHostConfig.hosts?.[hostId]
      ? {
          volumes:
            this._platformConfig.dockerHostConfig.hosts[hostId].volumes?.[
              profileKey
            ],
          gpus: this._platformConfig.dockerHostConfig.hosts[hostId].gpus?.[
            profileKey
          ],
          extraHosts:
            this._platformConfig.dockerHostConfig.hosts[hostId].extraHosts?.[
              profileKey
            ],
          networkMode:
            this._platformConfig.dockerHostConfig.hosts[hostId].networkMode?.[
              profileKey
            ],
        }
      : {}

    const container = await this.findOrCreateContainer(hostId, {
      image,
      labels,
      volumes,
      gpus,
      networkMode,
      extraHosts,
    })

    if (!container) {
      throw new Error('CONTAINER_NOT_FOUND')
    }

    // Ensure container is running
    const isRunning = await adapter.isContainerRunning(container.id)
    if (!isRunning) {
      throw new Error('CONTAINER_NOT_RUNNING')
    }
    this.logger.debug('execInContainer:', {
      hostId,
      container,
      command,
      labels,
    })

    const { state, output } = await adapter.execInContainer(container.id, {
      command,
    })

    return {
      hostId,
      containerId: container.id,
      state,
      output,
    }
  }
}
