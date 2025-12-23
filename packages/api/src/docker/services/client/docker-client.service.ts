import { Logger } from '@nestjs/common'

import type { DockerExecuteJobOptions } from './docker.schema'
import type {
  ConnectionTestResult,
  ContainerInfo,
  CreateContainerOptions,
  DockerAdapter,
  DockerExecResult,
} from './docker-client.types'

export class DockerClient {
  private readonly logger = new Logger(DockerClient.name)
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
   * Test connectivity to a Docker host
   */
  async testHostConnection(hostId: string): Promise<ConnectionTestResult> {
    return this.getAdapter(hostId).testConnection()
  }

  /**
   * Test connectivity to a Docker host
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

  /**
   * Execute a command in a running container
   */
  async execInContainer<T extends boolean>(
    hostId: string,
    containerId: string,
    options: DockerExecuteJobOptions & { waitForCompletion: T },
  ): Promise<DockerExecResult<T>> {
    const adapter = this.getAdapter(hostId)

    // Ensure container is running
    const isRunning = await adapter.isContainerRunning(containerId)
    if (!isRunning) {
      throw new Error('CONTAINER_NOT_RUNNING')
    }

    const result = await adapter.exec(containerId, options)
    if (options.waitForCompletion) {
      const [agentLogs, jobLogs, workerLogs] = await Promise.all([
        adapter.getAgentLogs(containerId),
        adapter.getJobLogs(containerId, { jobId: options.jobId }),
        options.jobInterface.kind !== 'exec_per_job'
          ? adapter.getWorkerLogs(containerId, {
              jobClass: options.jobName,
            })
          : Promise.resolve(''),
      ])
      this.logger.debug('\nresult:\n%s\n', JSON.stringify(result, null, 2))
      this.logger.debug('\nagentLogs:\n%s\n', agentLogs)
      this.logger.debug('\njobLogs:\n%s\n', jobLogs)
      if (options.jobInterface.kind !== 'exec_per_job') {
        this.logger.debug('\nworkerLogs:\n%s\n', workerLogs)
      }
      return result as DockerExecResult<T>
    }
    return {
      jobId: options.jobId,
    } as DockerExecResult<T>
  }
}
