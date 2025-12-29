import type { JsonSerializableObject } from '@lombokapp/types'
import type { z } from 'zod'

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
  pullImage: (image: string) => Promise<void>

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

export class DockerError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'DockerError'
  }
}

export class DockerJobExecuteError extends DockerError {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(code, message)
    this.name = 'DockerJobExecuteError'
  }
}

export class DockerJobSubmitError extends DockerError {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(code, message)
    this.name = 'DockerJobSubmitError'
  }
}

export class DockerJobSubmissionError extends DockerJobSubmitError {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(code, message)
    this.name = 'DockerJobSubmissionError'
  }
}

export class DockerJobCompletionError extends DockerJobExecuteError {
  constructor(code: string, message: string) {
    super(code, message)
    this.name = 'DockerJobCompletionError'
  }
}

export class DockerLogAccessError extends DockerError {
  constructor(code: string, message: string) {
    super(code, message)
    this.name = 'DockerLogAccessError'
  }
}
