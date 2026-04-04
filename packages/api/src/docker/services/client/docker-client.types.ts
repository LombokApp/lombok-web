import type { JsonSerializableObject } from '@lombokapp/types'

export interface ContainerInfo {
  id: string
  image: string
  labels: Record<string, string>
  state: 'running' | 'exited' | 'paused' | 'created' | 'unknown'
  /** Whether the container can be (re)started without needing to be recreated */
  reusable: boolean
  createdAt: string
}

export interface FindOrCreateContainerOptions {
  image: string
  labels: Record<string, string>
  env?: Record<string, string>
  extraHosts?: string[]
  volumes?: string[]
  networkMode?: 'host' | 'bridge' | `container:${string}`
  gpus?: { driver: string; deviceIds: string[] }
  startIfNotRunning?: boolean
}

export interface ConnectionTestResult {
  success: boolean
  version?: string
  apiVersion?: string
  error?: string
}

export interface DockerLogEntry {
  stream: 'stdout' | 'stderr'
  text: string
}

export interface DockerHostResources {
  cpuCores?: number
  memoryBytes?: number
  info: JsonSerializableObject
}

export interface DockerContainerStats {
  cpuPercent?: number
  memoryBytes?: number
  memoryLimitBytes?: number
  memoryPercent?: number
}

export interface DockerContainerGpuInfo {
  driver?: string
  command?: string
  output?: string
  error?: string
}

export interface DockerTtyStream {
  /** Write data to the container's stdin */
  write: (data: string | Buffer) => void
  /** Register handler for data from container's stdout */
  onData: (handler: (data: Buffer) => void) => void
  /** Register handler for stream end/close */
  onEnd: (handler: () => void) => void
  /** Resize the PTY */
  resize: (cols: number, rows: number) => Promise<void>
  /** Close/destroy the stream */
  destroy: () => void
}

export interface DockerPipeStream {
  /** Write data to the container's stdin */
  write: (data: string | Buffer) => void
  /** Register handler for stdout data from container */
  onStdout: (handler: (data: Buffer) => void) => void
  /** Register handler for stderr data from container */
  onStderr: (handler: (data: Buffer) => void) => void
  /** Register handler for stream end/close */
  onEnd: (handler: () => void) => void
  /** Close/destroy the stream */
  destroy: () => void
}

export type DockerSynchronousExecResult =
  | {
      jobId: string
      containerId: string
      result: JsonSerializableObject
    }
  | {
      jobId: string
      containerId?: string
      submitError: {
        code: string
        message: string
        details?: JsonSerializableObject
      }
    }
  | {
      jobId: string
      containerId?: string
      error: {
        code: string
        message: string
        details?: JsonSerializableObject
      }
    }

export interface DockerAsynchronousExecResult {
  jobId: string
  containerId: string
  submitError?: {
    code: string
    message: string
  }
}

export type DockerExecResult<T extends boolean> = T extends true
  ? DockerSynchronousExecResult
  : DockerAsynchronousExecResult

export class DockerError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'DockerError'
  }
}

export class DockerLogAccessError extends DockerError {
  constructor(code: string, message: string) {
    super(code, message)
    this.name = 'DockerLogAccessError'
  }
}
