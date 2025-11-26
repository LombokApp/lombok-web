import type {
  ContainerInfo,
  CreateContainerOptions,
  DockerAdapter,
  ExecOptions,
  ExecResult,
  PingResult,
} from './docker-manager.types'

export class DockerManager {
  constructor(
    private readonly dockerHostAdapters: Record<string, DockerAdapter>,
  ) {}

  /**
   * Get a docker adapter by host ID
   */
  private getAdapter(hostId: string): DockerAdapter {
    if (!(hostId in this.dockerHostAdapters)) {
      throw new Error(`Docker adapter not found for host: ${hostId}`)
    }
    return this.dockerHostAdapters[hostId]
  }

  /**
   * Test connectivity to a Docker host by calling the version endpoint
   */
  async ping(hostId: string): Promise<PingResult> {
    return this.getAdapter(hostId).ping()
  }

  /**
   * Run a docker image on the specified host
   */
  async runImage(
    hostId: string,
    {
      image,
      command,
      environmentVariables = {},
    }: {
      image: string
      command?: string[]
      environmentVariables?: Record<string, string>
    },
  ): Promise<void> {
    return this.getAdapter(hostId).run({
      image,
      command,
      environmentVariables,
    })
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
      // eslint-disable-next-line no-console
      console.error('Failed to create container:', error)
      return null
    }
  }

  /**
   * Execute a command in a running container
   */
  async execInContainer(
    hostId: string,
    containerId: string,
    options: ExecOptions,
  ): Promise<ExecResult> {
    const adapter = this.getAdapter(hostId)

    // Ensure container is running
    const isRunning = await adapter.isContainerRunning(containerId)
    if (!isRunning) {
      return {
        success: false,
        error: {
          code: 'CONTAINER_NOT_RUNNING',
          message: `Container ${containerId} is not running`,
        },
      }
    }

    return adapter.exec(containerId, options)
  }
}
