import type { IDockerAdapterProvider } from '../services/client/adapters/docker-adapter.provider'
import type { DockerAdapter } from '../services/client/docker-client.types'

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
    execInContainer: async (
      _containerId: string,
      _options: { command: string[] },
    ) => {
      return {
        output: () => Promise.resolve({ stdout: 'mock-output', stderr: '' }),
        state: () =>
          Promise.resolve({
            running: false,
            exitCode: 0,
            output: { stdout: 'mock-output', stderr: '' },
          }),
      }
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    execInContainerAndReturnOutput: async (
      _containerId: string,
      _command: string[],
    ) => {
      return { stdout: 'mock-output', stderr: '' }
    },

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    startContainer: async () => {},
    // eslint-disable-next-line @typescript-eslint/require-await
    isContainerRunning: async () => true,
  }
}
