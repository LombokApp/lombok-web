import type net from 'node:net'

export interface ExecOptions {
  tty: boolean
  env?: string[]
  workingDir?: string
}

export interface StartExecOptions {
  tty: boolean
  stdin?: boolean
}

export interface ExecInspect {
  running: boolean
  exitCode: number | null
  pid: number
}

export interface ContainerInfo {
  id: string
  names: string[]
  state: string
}

export interface CreateContainerOptions {
  image: string
  labels: Record<string, string>
  env?: Record<string, string>
  extraHosts?: string[]
  volumes?: string[]
  networkMode?: string
  gpus?: { driver: string; deviceIds: string[] }
  capAdd?: string[]
  securityOpt?: string[]
}

export interface BridgeContainerInfo {
  id: string
  image: string
  labels: Record<string, string>
  state: string
  reusable: boolean
  createdAt: string
  names: string[]
}

export interface ConnectionTestResult {
  success: boolean
  version?: string
  apiVersion?: string
  error?: string
}

export interface ContainerStats {
  cpuPercent?: number
  memoryBytes?: number
  memoryLimitBytes?: number
  memoryPercent?: number
}

export interface LogEntry {
  stream: 'stdout' | 'stderr'
  text: string
}

export interface HostResources {
  cpuCores?: number
  memoryBytes?: number
  info: Record<string, unknown>
}

export interface PullImageOptions {
  registryAuth?: {
    username: string
    password: string
    serveraddress?: string
  }
}

export interface DockerAdapter {
  // Exec lifecycle (tunnel/session use)
  createExec: (
    containerId: string,
    cmd: string[],
    opts: ExecOptions,
  ) => Promise<string>
  startExec: (execId: string, opts: StartExecOptions) => Promise<net.Socket>
  resizeExec: (execId: string, cols: number, rows: number) => Promise<void>
  inspectExec: (execId: string) => Promise<ExecInspect>
  killExec: (containerId: string, execPid: number) => Promise<void>
  ping: () => Promise<boolean>

  // Synchronous exec (run command, wait for completion, return output)
  execSync: (
    containerId: string,
    command: string[],
    options?: { env?: string[] },
  ) => Promise<{ stdout: string; stderr: string; exitCode: number }>

  // Container lifecycle
  createContainer: (
    options: CreateContainerOptions,
  ) => Promise<BridgeContainerInfo>
  startContainer: (containerId: string) => Promise<void>
  stopContainer: (containerId: string) => Promise<void>
  restartContainer: (containerId: string) => Promise<void>
  removeContainer: (
    containerId: string,
    options?: { force?: boolean },
  ) => Promise<void>

  // Container info
  listContainers: () => Promise<ContainerInfo[]>
  getContainerInspect: (containerId: string) => Promise<unknown>
  getContainerStats: (containerId: string) => Promise<ContainerStats>
  getContainerLogs: (
    containerId: string,
    options?: { tail?: number },
  ) => Promise<LogEntry[]>
  isContainerRunning: (containerId: string) => Promise<boolean>
  listContainersByLabels: (
    labels: Record<string, string>,
  ) => Promise<BridgeContainerInfo[]>

  // Host
  testConnection: () => Promise<ConnectionTestResult>
  getHostResources: () => Promise<HostResources>

  // Image
  pullImage: (image: string, options?: PullImageOptions) => Promise<void>
}
