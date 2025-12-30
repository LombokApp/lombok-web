import type { IDockerAdapterProvider } from '../services/client/adapters/docker-adapter.provider'
import type { DockerAdapter } from '../services/client/docker-client.types'
import { DockerError } from '../services/client/docker-client.types'

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
    startContainer: () => Promise.resolve(),
    isContainerRunning: () => Promise.resolve(true),
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
      const stdout = _options.command.includes('job-state')
        ? '{"job_id":"123","job_class":"test_job","status":"complete","success":true}'
        : 'mock-output'
      return {
        getError: () =>
          Promise.resolve(new DockerError('UNKNOWN_ERROR', 'Unknown error')),
        output: () => ({ stdout, stderr: '' }),
        state: () =>
          Promise.resolve({
            running: false,
            exitCode: 0,
            output: {
              stdout,
              stderr: '',
            },
          }),
      }
    },
  }
}
