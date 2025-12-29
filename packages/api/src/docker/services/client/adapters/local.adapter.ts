import { Logger } from '@nestjs/common'
import Docker from 'dockerode'
import * as fs from 'fs'
import { PassThrough } from 'stream'

import type { ContainerExecuteOptions } from '../docker.schema'
import {
  type ConnectionTestResult,
  type ContainerInfo,
  type CreateContainerOptions,
  type DockerAdapter,
  DockerError,
  type DockerStateFunc,
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

    this.logger.log('createContainerOptions:', createContainerOptions)

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

  private async execInContainerAndCapture(
    containerId: string,
    command: string[],
  ): Promise<{
    getError: () => Promise<DockerError>
    state: DockerStateFunc
    output: () => { stdout: string; stderr: string }
  }> {
    const container = this.docker.getContainer(containerId)

    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false, // must be false to demux
    })

    const stream = await exec.start({ Tty: false })
    const stdoutStream = new PassThrough()
    const stderrStream = new PassThrough()

    let stdout = ''
    let stderr = ''

    stdoutStream.on('data', (b: Buffer) => (stdout += b.toString('utf8')))
    stderrStream.on('data', (b: Buffer) => (stderr += b.toString('utf8')))

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    exec.modem.demuxStream(stream, stdoutStream, stderrStream)

    // Important: resolve on 'close' as well as 'end'
    await new Promise<void>((resolve, reject) => {
      stream.on('end', resolve)
      stream.on('close', resolve)
      stream.on('error', reject)
    })

    return {
      getError: () =>
        exec
          .inspect()
          .then((state) => this.resolveError(state, { stdout, stderr })),
      state: () =>
        exec.inspect().then((state) =>
          !state.Running
            ? {
                running: false,
                exitCode: state.ExitCode === 0 ? 0 : (state.ExitCode ?? 1),
              }
            : {
                running: true,
                exitCode: null,
              },
        ),
      output: () => {
        return { stdout, stderr }
      },
    }
  }

  private resolveError(
    state: Docker.ExecInspectInfo,
    { stderr }: { stdout: string; stderr: string },
  ): DockerError {
    if (state.ExitCode === 0) {
      throw new Error(`getError called for non-failed exec`)
    }

    if (stderr.includes('argument list too long')) {
      return new DockerError(
        'COMMAND_ARGUMENT_LIST_TOO_LONG',
        'Error: ' + stderr,
      )
    }

    return new DockerError('UNKNOWN_ERROR', 'Unknown error: ' + stderr)
  }

  async execInContainer(containerId: string, options: ContainerExecuteOptions) {
    return this.execInContainerAndCapture(containerId, options.command)
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
