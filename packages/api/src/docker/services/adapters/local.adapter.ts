import * as fs from 'node:fs'

import Docker from 'dockerode'

import type {
  ContainerInfo,
  CreateContainerOptions,
  DockerAdapter,
  DockerRunConfig,
  ExecOptions,
  ExecResult,
  PingResult,
} from '../docker-manager.types'
import {
  type DockerEndpointAuth,
  DockerEndpointAuthType,
} from '../schemas/docker-endpoint-authentication.schema'

export class LocalDockerAdapter implements DockerAdapter {
  private readonly docker: Docker

  constructor(dockerHost: string, dockerEndpointAuth?: DockerEndpointAuth) {
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
        // eslint-disable-next-line no-console
        console.error(
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
        // eslint-disable-next-line no-console
        console.error(
          `[Docker] ${socketPath} exists but is not a socket. ` +
            `Found: ${stats.isFile() ? 'file' : stats.isDirectory() ? 'directory' : 'unknown'}`,
        )
        return
      }

      // Try to access the socket (via the proxy) for read/write
      fs.accessSync(proxySocketPath, fs.constants.R_OK | fs.constants.W_OK)

      // eslint-disable-next-line no-console
      console.log(
        `[Docker] Socket at ${socketPath} is accessible, via proxy at ${proxySocketPath}`,
      )
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        const nodeError = error as NodeJS.ErrnoException

        if (nodeError.code === 'EACCES') {
          // eslint-disable-next-line no-console
          console.error(
            `[Docker] Permission denied accessing socket at ${socketPath} (via proxy at ${proxySocketPath}). ` +
              `The container user does not have permission to access the Docker socket. `,
          )
        } else if (nodeError.code === 'ENOENT') {
          // eslint-disable-next-line no-console
          console.error(
            `[Docker] Socket not found at ${socketPath}. ` +
              `Make sure the Docker socket is mounted: -v /var/run/docker.sock:/var/run/docker.sock`,
          )
        } else {
          // eslint-disable-next-line no-console
          console.error(
            `[Docker] Error accessing socket at ${socketPath}: ${nodeError.code} - ${nodeError.message}`,
          )
        }
      } else {
        // eslint-disable-next-line no-console
        console.error(
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

  async ping(): Promise<PingResult> {
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
    // eslint-disable-next-line no-console
    console.log(`[Docker] Pulling image: ${image}`)

    const stream = await this.docker.pull(image)

    // Wait for the pull to complete by consuming the stream
    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(
        stream,
        (err: Error | null) => {
          if (err) {
            reject(err)
          } else {
            // eslint-disable-next-line no-console
            console.log(`[Docker] Successfully pulled image: ${image}`)
            resolve()
          }
        },
        (event: { status?: string; progress?: string }) => {
          // Optional: log progress updates
          if (event.status) {
            // eslint-disable-next-line no-console
            console.log(
              `[Docker] ${event.status}${event.progress ? `: ${event.progress}` : ''}`,
            )
          }
        },
      )
    })
  }

  async run(runConfig: DockerRunConfig): Promise<void> {
    const container = await this.docker.createContainer({
      Image: runConfig.image,
      Cmd: runConfig.command,
      Env: runConfig.environmentVariables
        ? Object.entries(runConfig.environmentVariables).map(
            ([key, value]) => `${key}=${value}`,
          )
        : undefined,
    })

    await container.start()
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

    const container = await this.docker.createContainer({
      Image: options.image,
      Cmd: options.command,
      Env: options.environmentVariables
        ? Object.entries(options.environmentVariables).map(
            ([key, value]) => `${key}=${value}`,
          )
        : undefined,
      Labels: options.labels,
    })

    await container.start()

    return {
      id: container.id,
      image: options.image,
      labels: options.labels,
      state: 'running',
      createdAt: new Date().toISOString(),
    }
  }

  async exec(containerId: string, options: ExecOptions): Promise<ExecResult> {
    try {
      const container = this.docker.getContainer(containerId)

      // Build the payload for the platform-agent
      const payload = {
        job_id: crypto.randomUUID(),
        job_class: options.jobClass,
        worker_command: ['/app/worker'], // Default worker path, can be customized per job class
        interface: {
          kind: options.mode === 'sync' ? 'exec_per_job' : 'persistent_http',
        },
        job_input: options.payload,
      }

      // Base64 encode the payload
      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(
        'base64',
      )

      // Build the command to run in the container
      const agentCommand = [
        'platform-agent',
        'run-job',
        `--payload-base64=${payloadBase64}`,
      ]

      const exec = await container.exec({
        Cmd: agentCommand,
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

      // Try to parse output as JSON result from the agent
      try {
        const result = JSON.parse(output) as {
          success: boolean
          result?: unknown
          error?: { code: string; message: string }
        }
        return result
      } catch {
        // If output is not valid JSON, treat it as a raw result
        return {
          success: true,
          result: output,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXEC_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      }
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
}
