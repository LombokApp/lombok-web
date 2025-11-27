import type { z } from 'zod'

import type {
  dockerExecutionOptionsSchema,
  dockerManagerRunConfigSchema,
} from './schemas/docker-manager-run-config.schema'

export interface ContainerInfo {
  id: string
  image: string
  labels: Record<string, string>
  state: 'running' | 'exited' | 'paused' | 'created' | 'unknown'
  createdAt: string
}

export interface CreateContainerOptions {
  image: string
  command?: string[]
  environmentVariables?: Record<string, string>
  labels: Record<string, string>
  profileName: string
  appIdentifier: string
}

export interface ExecOptions {
  mode: 'sync' | 'async'
  jobClass: string
  payload: unknown
  platformUrl?: string
  jobToken?: string
}

export interface ExecResult {
  success: boolean
  result?: unknown
  error?: {
    code: string
    message: string
  }
}

export interface PingResult {
  success: boolean
  version?: string
  apiVersion?: string
  error?: string
}

export interface DockerAdapter {
  /**
   * Test connectivity to the Docker host
   */
  ping: () => Promise<PingResult>
  run: (runConfig: DockerRunConfig) => Promise<void>

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
  exec: (containerId: string, options: ExecOptions) => Promise<ExecResult>

  /**
   * Start a stopped container
   */
  startContainer: (containerId: string) => Promise<void>

  /**
   * Check if a container is running
   */
  isContainerRunning: (containerId: string) => Promise<boolean>
}

export type DockerRunConfig = z.infer<typeof dockerManagerRunConfigSchema>
export type DockerExecutionOptions = z.infer<
  typeof dockerExecutionOptionsSchema
>
