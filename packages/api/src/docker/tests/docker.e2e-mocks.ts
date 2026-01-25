import type { ContainerInspectInfo } from 'dockerode'

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
    stopContainer: () => Promise.resolve(),
    restartContainer: () => Promise.resolve(),
    removeContainer: () => Promise.resolve(),
    getContainerLogs: () => Promise.resolve([]),
    getContainerStats: () =>
      Promise.resolve({
        cpuPercent: 0,
        memoryBytes: 0,
        memoryLimitBytes: 0,
        memoryPercent: 0,
      }),
    getContainerInspect: () =>
      Promise.resolve({
        Id: 'mock-container',
        Created: new Date().toISOString(),
        Path: '/bin/sh',
        Args: [],
        State: {
          Status: 'running',
          Running: true,
          Paused: false,
          Restarting: false,
          OOMKilled: false,
          Dead: false,
          Pid: 12345,
          ExitCode: 0,
          Error: '',
          StartedAt: new Date().toISOString(),
          FinishedAt: '',
        },
        Image: 'mock-image:latest',
        ResolvConfPath: '/var/lib/docker/containers/mock-container/resolv.conf',
        HostnamePath: '/var/lib/docker/containers/mock-container/hostname',
        HostsPath: '/var/lib/docker/containers/mock-container/hosts',
        LogPath:
          '/var/lib/docker/containers/mock-container/mock-container-json.log',
        Name: '/mock-container',
        RestartCount: 0,
        Driver: 'overlay2',
        Platform: 'linux',
        MountLabel: '',
        ProcessLabel: '',
        AppArmorProfile: '',
        ExecIDs: undefined,
        GraphDriver: {
          Name: 'overlay2',
          Data: {
            DeviceId: 'mock-device-id',
            DeviceName: 'mock-device-name',
            DeviceSize: '0',
          },
        },
        HostConfig: {
          DeviceRequests: [],
          Devices: [],
        },
        Mounts: [],
        Config: {
          Hostname: 'mock-container',
          Domainname: '',
          User: '',
          AttachStdin: false,
          AttachStdout: true,
          AttachStderr: true,
          ExposedPorts: {},
          Tty: false,
          OpenStdin: false,
          StdinOnce: false,
          Env: [],
          Cmd: [],
          Image: 'mock-image:latest',
          Volumes: {},
          WorkingDir: '',
          Entrypoint: undefined,
          OnBuild: undefined,
          Labels: {},
        },
        NetworkSettings: {
          SandboxID: '',
          Ports: {},
          SandboxKey: '',
          Networks: {},
        },
      } satisfies ContainerInspectInfo),
    getHostResources: () =>
      Promise.resolve({
        cpuCores: 4,
        memoryBytes: 0,
        info: { MemTotal: 0, NCPU: 4 },
      }),
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
