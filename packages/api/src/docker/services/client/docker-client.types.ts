import type { z } from 'zod'

import type {
  ContainerWorkerExecuteOptions,
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
  volumes?: Record<string, string>
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
  exec: <T extends boolean>(
    containerId: string,
    options: ContainerWorkerExecuteOptions<T>,
  ) => Promise<DockerExecResult<T>>

  /**
   * Start a stopped container
   */
  startContainer: (containerId: string) => Promise<void>

  /**
   * Check if a container is running
   */
  isContainerRunning: (containerId: string) => Promise<boolean>

  /**
   * Get agent logs from a container
   */
  getAgentLogs: (
    containerId: string,
    options?: { tail?: number; grep?: string },
  ) => Promise<string>

  /**
   * Get worker logs from a container
   */
  getWorkerLogs: (
    containerId: string,
    options: { jobClass: string; tail?: number; err?: boolean },
  ) => Promise<string>

  /**
   * Get job logs from a container
   */
  getJobLogs: (
    containerId: string,
    options: { jobId: string; tail?: number; err?: boolean },
  ) => Promise<string>
}

export type DockerExecutionOptions = z.infer<
  typeof dockerExecutionOptionsSchema
>

export interface DockerSynchronousExecResult {
  jobId: string
  success: boolean
  result: unknown
  jobError?: {
    code: string
    message: string
  }
}

export type DockerExecResult<T extends boolean> = T extends true
  ? DockerSynchronousExecResult
  : {
      jobId: string
      accepted: boolean
      queueError?: {
        code: string
        message: string
      }
    }
