import type { ContainerInspectInfo } from 'dockerode'

import type { DockerClientService } from '../services/client/docker-client.service'

type MockDockerClientService = {
  [K in keyof DockerClientService]: DockerClientService[K]
}

export const buildMockDockerClientService = (): MockDockerClientService => {
  const mockInspect: ContainerInspectInfo = {
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
  }

  return {
    testHostConnection: async () => ({
      success: true,
      message: 'Mock Docker Host Test Successful',
    }),
    testAllHostConnections: async () => ({}),
    getHostDescription: () => 'Mock Docker Host',
    listContainersByLabels: async () => [],
    createContainer: async () => ({
      id: '1',
      image: 'mock-image',
      labels: {},
      state: 'running' as const,
      reusable: true,
      createdAt: new Date().toISOString(),
    }),
    getContainerLogs: async () => [],
    getHostResources: async () => ({
      cpuCores: 4,
      memoryBytes: 0,
      info: { MemTotal: 0, NCPU: 4 },
    }),
    getContainerStats: async () => ({
      cpuPercent: 0,
      memoryBytes: 0,
      memoryLimitBytes: 0,
      memoryPercent: 0,
    }),
    getContainerInspect: async () => mockInspect,
    getContainerGpuInfo: async () => undefined,
    startContainer: async () => undefined,
    stopContainer: async () => undefined,
    restartContainer: async () => undefined,
    removeContainer: async () => undefined,
    pullImage: async () => undefined,
    execInContainer: async (
      _hostId: string,
      _containerId: string,
      command: string[],
    ) => {
      const stdout = command.includes('job-state')
        ? '{"job_id":"123","job_class":"test_job","status":"complete","success":true}'
        : 'mock-output'
      return {
        exitCode: 0,
        stdout,
        stderr: '',
      }
    },
    execPipe: async () => ({
      write: () => undefined,
      onStdout: () => undefined,
      onStderr: () => undefined,
      onEnd: () => undefined,
      destroy: () => undefined,
    }),
    findContainerById: async () => ({
      id: 'mock-container',
      image: 'mock-image:latest',
      labels: {},
      state: 'running' as const,
      reusable: true,
      createdAt: new Date().toISOString(),
    }),
    findOrCreateContainer: async () => ({
      id: '1',
      image: 'mock-image',
      labels: {},
      state: 'running' as const,
      reusable: true,
      createdAt: new Date().toISOString(),
    }),
    execTty: async () => ({
      write: () => undefined,
      onData: () => undefined,
      onEnd: () => undefined,
      resize: async () => undefined,
      destroy: () => undefined,
    }),
    createTunnelSession: async () => ({
      publicId: 'mock-tunnel',
      sessionId: 'mock-session',
      token: 'mock-token',
      url: 'http://mock-tunnel-url',
      wsUrl: 'ws://mock-ws-url',
      httpUrl: 'http://mock-http-url',
    }),
    deleteTunnelSession: async () => undefined,
  } as unknown as MockDockerClientService
}
