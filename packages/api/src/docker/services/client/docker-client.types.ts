import type { JsonSerializableObject } from '@lombokapp/types'
import type { ContainerInspectInfo } from 'dockerode'
import type { z } from 'zod'

import type { DockerPullOptions } from './adapters/local.adapter'
import type {
  ContainerExecuteOptions,
  dockerExecutionOptionsSchema,
} from './docker.schema'

export interface ContainerInfo {
  id: string
  image: string
  labels: Record<string, string>
  state: 'running' | 'exited' | 'paused' | 'created' | 'unknown'
  createdAt: string
}

export interface CreateContainerOptions {
  image: string
  environmentVariables?: Record<string, string>
  labels: Record<string, string>
  extraHosts?: string[]
  volumes?: string[]
  networkMode?: 'host' | 'bridge' | `container:${string}`
  gpus?: { driver: string; deviceIds: string[] }
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

export interface DockerAdapter {
  /**
   * Get the description of the underlying docker resource
   */
  getDescription: () => string

  /**
   * Test connectivity to the Docker host
   */
  testConnection: () => Promise<ConnectionTestResult>

  /**
   * Pull an image from a registry
   */
  pullImage: (image: string, options: DockerPullOptions) => Promise<void>

  /**
   * List containers matching the given labels
   */
  listContainersByLabels: (
    labels: Record<string, string>,
  ) => Promise<ContainerInfo[]>

  /**
   * Create a new container with the given configuration
   */
  createContainer: (options: CreateContainerOptions) => Promise<ContainerInfo>

  /**
   * Execute a command in a running container
   */
  execInContainer: (
    containerId: string,
    options: ContainerExecuteOptions,
  ) => Promise<{
    getError: () => Promise<DockerError>
    state: DockerStateFunc
    output: () => { stdout: string; stderr: string }
  }>

  /**
   * Start a stopped container
   */
  startContainer: (containerId: string) => Promise<void>

  /**
   * Stop a running container
   */
  stopContainer: (containerId: string) => Promise<void>

  /**
   * Restart a container
   */
  restartContainer: (containerId: string) => Promise<void>

  /**
   * Remove a container
   */
  removeContainer: (
    containerId: string,
    options?: { force?: boolean },
  ) => Promise<void>

  /**
   * Get container logs
   */
  getContainerLogs: (
    containerId: string,
    options?: { tail?: number; timestamps?: boolean },
  ) => Promise<DockerLogEntry[]>

  /**
   * Get host resource info
   */
  getHostResources: () => Promise<DockerHostResources>

  /**
   * Get container resource usage
   */
  getContainerStats: (containerId: string) => Promise<DockerContainerStats>

  /**
   * Get container inspection data
   */
  getContainerInspect: (containerId: string) => Promise<ContainerInspectInfo>

  /**
   * Check if a container is running
   */
  isContainerRunning: (containerId: string) => Promise<boolean>
}

export type DockerExecutionOptions = z.infer<
  typeof dockerExecutionOptionsSchema
>

export type DockerSynchronousExecResult =
  | {
      jobId: string
      result: JsonSerializableObject
    }
  | {
      jobId: string
      submitError: {
        code: string
        message: string
        details?: JsonSerializableObject
      }
    }
  | {
      jobId: string
      error: {
        code: string
        message: string
        details?: JsonSerializableObject
      }
    }

export interface DockerAsynchronousExecResult {
  jobId: string
  submitError?: {
    code: string
    message: string
  }
}

export type DockerExecResult<T extends boolean> = T extends true
  ? DockerSynchronousExecResult
  : DockerAsynchronousExecResult

export type DockerStateFunc = (timeoutMs?: number) => Promise<DockerExecState>

export type DockerExecState = DockerExecStateRunning | DockerExecStateExited

export interface DockerExecStateRunning {
  running: true
  exitCode: null
}

export interface DockerExecStateExited {
  running: false
  exitCode: number
}

export enum DockerAdapterErrorCode {
  IMAGE_NOT_FOUND = 'IMAGE_NOT_FOUND',
  IMAGE_PULL_ERROR = 'IMAGE_PULL_ERROR',
  COMMAND_ARGUMENT_LIST_TOO_LONG = 'COMMAND_ARGUMENT_LIST_TOO_LONG',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  HOST_CONNECTION_ERROR = 'HOST_CONNECTION_ERROR',
  HOST_CONNECTION_TIMEOUT = 'HOST_CONNECTION_TIMEOUT',
  CONTAINER_NOT_FOUND = 'CONTAINER_NOT_FOUND',
  CONTAINER_NOT_RUNNING = 'CONTAINER_NOT_RUNNING',
  CONTAINER_START_FAILED = 'CONTAINER_START_FAILED',
  CONTAINER_START_ERROR = 'CONTAINER_START_ERROR',
}

export class DockerAdapterError extends Error {
  constructor(
    public readonly code: DockerAdapterErrorCode,
    message: string,
    public readonly cause?: Error,
  ) {
    super(message)
    this.name = 'DockerAdapterError'
  }
}

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
