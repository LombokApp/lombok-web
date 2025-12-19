import { Logger } from '@nestjs/common'
import Docker from 'dockerode'
import * as fs from 'fs'

import type { ContainerWorkerExecuteOptions } from '../docker.schema'
import type {
  ConnectionTestResult,
  ContainerInfo,
  CreateContainerOptions,
  DockerAdapter,
  DockerExecResult,
} from '../docker-client.types'
import {
  type DockerEndpointAuth,
  DockerEndpointAuthType,
} from './docker-endpoint-authentication.schema'

export class LocalDockerAdapter implements DockerAdapter {
  private readonly docker: Docker
  private readonly host: string
  private readonly logger = new Logger(LocalDockerAdapter.name)
  constructor(dockerHost: string, dockerEndpointAuth?: DockerEndpointAuth) {
    this.host = dockerHost

    const isHttpEndpoint = /^https?:\/\//i.test(dockerHost)

    if (isHttpEndpoint) {
      // Parse the URL to extract host and port
      const url = new URL(dockerHost)
      const options: Docker.DockerOptions = {
        host: url.hostname,
        port: url.port || (url.protocol === 'https:' ? '443' : '2375'),
        protocol: url.protocol === 'https:' ? 'https' : 'http',
      }

      // Add authentication if provided
      if (dockerEndpointAuth) {
        if (
          dockerEndpointAuth.authenticationType === DockerEndpointAuthType.Basic
        ) {
          const credentials = `${dockerEndpointAuth.username}:${dockerEndpointAuth.password}`
          options.headers = {
            Authorization: `Basic ${Buffer.from(credentials).toString('base64')}`,
          }
        } else {
          options.headers = {
            Authorization: `Bearer ${dockerEndpointAuth.apiKey}`,
          }
        }
      }

      this.docker = new Docker(options)
    } else {
      // Unix socket - check permissions first
      const proxySocket = '/tmp/docker-proxy.sock'
      this.checkSocketPermissions({
        proxySocketPath: proxySocket,
        socketPath: dockerHost,
      })
      this.docker = new Docker({ socketPath: proxySocket })
    }
  }

  getDescription(): string {
    return `[DOCKERODE]: ${this.host}`
  }

  /**
   * Check if the Docker socket exists and is accessible.
   * Logs detailed error messages if there are permission issues.
   */
  private checkSocketPermissions({
    proxySocketPath,
    socketPath,
  }: {
    proxySocketPath: string
    socketPath: string
  }): void {
    try {
      // Check if socket exists
      if (!fs.existsSync(socketPath)) {
        this.logger.error(
          `[Docker] Socket not found at ${socketPath}. ` +
            `Make sure the Docker socket is mounted in the container. ` +
            `Example: -v /var/run/docker.sock:/var/run/docker.sock`,
        )
        return
      }

      // Check socket stats
      const stats = fs.statSync(socketPath)

      // Check if it's actually a socket
      if (!stats.isSocket()) {
        this.logger.error(
          `[Docker] ${socketPath} exists but is not a socket. ` +
            `Found: ${stats.isFile() ? 'file' : stats.isDirectory() ? 'directory' : 'unknown'}`,
        )
        return
      }

      // Try to access the socket (via the proxy) for read/write
      fs.accessSync(proxySocketPath, fs.constants.R_OK | fs.constants.W_OK)

      this.logger.log(
        `[Docker] Socket at ${socketPath} is accessible, via proxy at ${proxySocketPath}`,
      )
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        const nodeError = error as NodeJS.ErrnoException

        if (nodeError.code === 'EACCES') {
          this.logger.error(
            `[Docker] Permission denied accessing socket at ${socketPath} (via proxy at ${proxySocketPath}). ` +
              `The container user does not have permission to access the Docker socket. `,
          )
        } else if (nodeError.code === 'ENOENT') {
          this.logger.error(
            `[Docker] Socket not found at ${socketPath}. ` +
              `Make sure the Docker socket is mounted: -v /var/run/docker.sock:/var/run/docker.sock`,
          )
        } else {
          this.logger.error(
            `[Docker] Error accessing socket at ${socketPath}: ${nodeError.code} - ${nodeError.message}`,
          )
        }
      } else {
        this.logger.error(
          `[Docker] Unknown error checking socket permissions: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  }

  /**
   * Map Docker API state to our state type
   */
  private mapContainerState(state: string): ContainerInfo['state'] {
    switch (state.toLowerCase()) {
      case 'running':
        return 'running'
      case 'exited':
        return 'exited'
      case 'paused':
        return 'paused'
      case 'created':
        return 'created'
      default:
        return 'unknown'
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const versionInfo = await this.docker.version()

      return {
        success: true,
        version: versionInfo.Version,
        apiVersion: versionInfo.ApiVersion,
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error connecting to Docker host',
      }
    }
  }

  async pullImage(image: string): Promise<void> {
    this.logger.log(`[Docker] Pulling image: ${image}`)

    const stream = await this.docker.pull(image)

    // Wait for the pull to complete by consuming the stream
    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(
        stream,
        (err: Error | null) => {
          if (err) {
            reject(err)
          } else {
            this.logger.log(`[Docker] Successfully pulled image: ${image}`)
            resolve()
          }
        },
        (event: { status?: string; progress?: string }) => {
          // Optional: log progress updates
          if (event.status) {
            this.logger.log(
              `[Docker] ${event.status}${event.progress ? `: ${event.progress}` : ''}`,
            )
          }
        },
      )
    })
  }

  async listContainersByLabels(
    labels: Record<string, string>,
  ): Promise<ContainerInfo[]> {
    const labelFilters = Object.entries(labels).map(
      ([key, value]) => `${key}=${value}`,
    )

    const containers = await this.docker.listContainers({
      all: true,
      filters: { label: labelFilters },
    })

    return containers.map((container) => ({
      id: container.Id,
      image: container.Image,
      labels: container.Labels,
      state: this.mapContainerState(container.State),
      createdAt: new Date(container.Created * 1000).toISOString(),
    }))
  }

  imageExists(image: string) {
    try {
      const _existingImage = this.docker.getImage(image).inspect()
      return true
    } catch {
      return false
    }
  }

  async createContainer(
    options: CreateContainerOptions,
  ): Promise<ContainerInfo> {
    if (!this.imageExists(options.image)) {
      await this.pullImage(options.image)
    }

    const createContainerOptions: Docker.ContainerCreateOptions = {
      Image: options.image,
      Env: options.environmentVariables
        ? Object.entries(options.environmentVariables).map(
            ([key, value]) => `${key}=${value}`,
          )
        : undefined,
      Labels: options.labels,
      ...(options.gpus ||
      options.networkMode ||
      options.volumes ||
      options.extraHosts
        ? {
            HostConfig: {
              ...(options.volumes && {
                Binds: options.volumes,
              }),
              ...(options.extraHosts && {
                ExtraHosts: options.extraHosts,
              }),
              ...(options.networkMode && { NetworkMode: options.networkMode }),
              ...(options.gpus && {
                DeviceRequests: [
                  {
                    Driver: options.gpus.driver,
                    DeviceIDs: options.gpus.deviceIds,
                    Options: {},
                    Capabilities: [['gpu']],
                  },
                ],
              }),
            },
          }
        : {}),
    }

    console.log('createContainerOptions:', createContainerOptions)

    const container = await this.docker.createContainer(createContainerOptions)

    await container.start()

    return {
      id: container.id,
      image: options.image,
      labels: options.labels,
      state: 'running',
      createdAt: new Date().toISOString(),
    }
  }

  async exec<T extends boolean>(
    containerId: string,
    options: ContainerWorkerExecuteOptions<T>,
  ): Promise<DockerExecResult<T>> {
    try {
      const container = this.docker.getContainer(containerId)

      // Build the payload for the lombok-worker-agent
      const payload: Record<string, unknown> = {
        job_id: options.jobId,
        job_class: options.jobIdentifier,
        job_input: options.jobData,
        job_token: options.jobToken,
        worker_command: options.jobCommand, // Default worker path, can be customized per job class
        interface: options.jobInterface,
        output_location: options.outputLocation,
        platform_url: options.platformURL,
      }

      // Base64 encode the payload
      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(
        'base64',
      )

      // Build the command to run in the container
      const agentCommand = [
        'lombok-worker-agent',
        'run-job',
        `--payload-base64=${payloadBase64}`,
      ]

      const exec = await container.exec({
        Cmd: agentCommand,
        AttachStdout: true,
        AttachStderr: true,
      })

      const stream = await exec.start({
        Detach: !options.waitForCompletion,
        Tty: false,
      })

      if (!options.waitForCompletion) {
        const asyncResponse: DockerExecResult<false> = {
          jobId: options.jobId,
          accepted: true,
        }
        return asyncResponse as DockerExecResult<
          typeof options.waitForCompletion
        >
      }

      try {
        // Collect output from the stream
        const output = await new Promise<string>((resolve, reject) => {
          let data = ''
          stream.on('data', (chunk: Buffer) => {
            // Docker multiplexes stdout/stderr, skip the 8-byte header
            // Each frame: [STREAM_TYPE(1), 0, 0, 0, SIZE(4), PAYLOAD]
            let offset = 0
            while (offset < chunk.length) {
              if (offset + 8 > chunk.length) {
                break
              }
              const size = chunk.readUInt32BE(offset + 4)
              if (offset + 8 + size > chunk.length) {
                break
              }
              data += chunk.subarray(offset + 8, offset + 8 + size).toString()
              offset += 8 + size
            }
          })
          stream.on('end', () => resolve(data))
          stream.on('error', reject)
        })

        // Try to parse output as JSON result from the agent
        try {
          const lastLineParsedOutout = JSON.parse(
            output.trim().split('\n').pop() ?? output,
          ) as {
            success: boolean
            result?: unknown
            job_class: string
            job_id: string
            error?: { code: string; message: string }
          }
          const resultParsed: DockerExecResult<true> = {
            success: lastLineParsedOutout.success,
            result: lastLineParsedOutout.result,
            jobId: options.jobId,
            jobError: lastLineParsedOutout.error,
          }
          return resultParsed as DockerExecResult<
            typeof options.waitForCompletion
          >
        } catch {
          // If output is not valid JSON, treat it as a raw result
          const resultRaw: DockerExecResult<true> = {
            success: false,
            result: undefined,
            jobId: options.jobId,
            jobError: {
              code: 'OUTPUT_PARSE_FAILED',
              message: [
                `\nRAW DOCKER EXEC OUTPUT`,
                `====================================================================`,
                output,
                `====================================================================\n`,
              ].join('\n'),
            },
          }
          return resultRaw as DockerExecResult<typeof options.waitForCompletion>
        }
      } catch (error) {
        throw new Error(
          `OUTPUT_CAPTURE_FAILED: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
          { cause: error },
        )
      }
    } catch (error) {
      throw new Error(
        `EXEC_FAILED: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
        { cause: error },
      )
    }
  }

  async startContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId)
    try {
      await container.start()
    } catch (error) {
      // 304 means container is already running, which is fine
      if (
        error instanceof Error &&
        'statusCode' in error &&
        (error as { statusCode: number }).statusCode === 304
      ) {
        return
      }
      throw error
    }
  }

  async isContainerRunning(containerId: string): Promise<boolean> {
    try {
      const container = this.docker.getContainer(containerId)
      const info = await container.inspect()
      return info.State.Running
    } catch {
      return false
    }
  }

  /**
   * Helper method to execute a command in a container and return the output as a string
   */
  private async executeCommand(
    containerId: string,
    command: string[],
  ): Promise<string> {
    const container = this.docker.getContainer(containerId)

    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
    })

    const stream = await exec.start({ Detach: false, Tty: false })

    // Collect output from the stream
    const output = await new Promise<string>((resolve, reject) => {
      let data = ''
      stream.on('data', (chunk: Buffer) => {
        // Docker multiplexes stdout/stderr, skip the 8-byte header
        // Each frame: [STREAM_TYPE(1), 0, 0, 0, SIZE(4), PAYLOAD]
        let offset = 0
        while (offset < chunk.length) {
          if (offset + 8 > chunk.length) {
            break
          }
          const size = chunk.readUInt32BE(offset + 4)
          if (offset + 8 + size > chunk.length) {
            break
          }
          data += chunk.subarray(offset + 8, offset + 8 + size).toString()
          offset += 8 + size
        }
      })
      stream.on('end', () => resolve(data))
      stream.on('error', reject)
    })

    return output
  }

  async getAgentLogs(
    containerId: string,
    options?: { tail?: number; grep?: string },
  ): Promise<string> {
    const command = ['lombok-worker-agent', 'agent-log']

    if (options?.grep) {
      command.push('--grep', options.grep)
    }

    if (options?.tail) {
      command.push('--tail', options.tail.toString())
    }

    return this.executeCommand(containerId, command)
  }

  async getWorkerLogs(
    containerId: string,
    options: { jobClass: string; tail?: number; err?: boolean },
  ): Promise<string> {
    const command = [
      'lombok-worker-agent',
      'worker-log',
      '--job-class',
      options.jobClass,
    ]

    if (options.err) {
      command.push('--err')
    }

    if (options.tail) {
      command.push('--tail', options.tail.toString())
    }

    return this.executeCommand(containerId, command)
  }

  async getJobLogs(
    containerId: string,
    options: { jobId: string; tail?: number; err?: boolean },
  ): Promise<string> {
    const command = [
      'lombok-worker-agent',
      'job-log',
      '--job-id',
      options.jobId,
    ]

    if (options.err) {
      command.push('--err')
    }

    if (options.tail) {
      command.push('--tail', options.tail.toString())
    }

    return this.executeCommand(containerId, command)
  }
}
