import type { IDockerAdapterProvider } from '../services/client/adapters/docker-adapter.provider'
import type { ContainerWorkerExecuteOptions } from '../services/client/docker.schema'
import type {
  DockerAdapter,
  DockerExecResult,
} from '../services/client/docker-client.types'

export class MockDockerAdapterProvider implements IDockerAdapterProvider {
  constructor(private readonly mockAdapter: DockerAdapter) {}

  getDockerAdapter(_hostId: string): DockerAdapter {
    return this.mockAdapter
  }
}

export const buildMockDockerAdapter = (hostId: string): DockerAdapter => {
  if (hostId !== 'local') {
    throw new Error(`Unsupported host ID: ${hostId}`)
  }
  return {
    getDescription: () => 'Mock Docker Host',
    // eslint-disable-next-line @typescript-eslint/require-await
    testConnection: async () => ({
      success: true,
      message: 'Mock Docker Host Test Successful',
    }),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    pullImage: async () => {},
    // eslint-disable-next-line @typescript-eslint/require-await
    listContainersByLabels: async () => [],
    // eslint-disable-next-line @typescript-eslint/require-await
    createContainer: async () => ({
      id: '1',
      image: 'mock-image',
      labels: {},
      state: 'running',
      createdAt: new Date().toISOString(),
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    exec: async <T extends boolean>(
      containerId: string,
      options: ContainerWorkerExecuteOptions<T>,
    ) => {
      const asyncResult: DockerExecResult<false> = {
        jobId: options.jobId,
        accepted: true,
      }

      const syncResult: DockerExecResult<true> = {
        jobId: options.jobId,
        success: true,
        result: {
          message: 'Mock Docker Job Executed Successfully',
        },
      }

      return (
        options.waitForCompletion ? syncResult : asyncResult
      ) as DockerExecResult<T>
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    startContainer: async () => {},
    // eslint-disable-next-line @typescript-eslint/require-await
    isContainerRunning: async () => true,
    // eslint-disable-next-line @typescript-eslint/require-await
    getAgentLogs: async () => '',
    // eslint-disable-next-line @typescript-eslint/require-await
    getWorkerLogs: async () => '',
    // eslint-disable-next-line @typescript-eslint/require-await
    getJobLogs: async () => '',
  }
}
