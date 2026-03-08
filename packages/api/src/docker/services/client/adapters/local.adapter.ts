import { convertUnknownToJsonSerializableObject } from '@lombokapp/types'
import { Logger } from '@nestjs/common'
import type { ContainerInspectInfo } from 'dockerode'
import Docker from 'dockerode'
import * as fs from 'fs'
import * as net from 'net'
import { PassThrough } from 'stream'

import type { ContainerExecuteOptions } from '../docker.schema'
import {
  type ConnectionTestResult,
  type ContainerInfo,
  type DockerAdapter,
  DockerAdapterError,
  DockerAdapterErrorCode,
  type DockerContainerStats,
  type DockerHostResources,
  type DockerLogEntry,
  type DockerPipeStream,
  type DockerStateFunc,
  type DockerTtyStream,
  type FindOrCreateContainerOptions,
} from '../docker-client.types'
import type {
  DockerEndpointAuth,
  DockerRegistryAuth,
} from './docker-endpoint-authentication.schema'
import { DockerEndpointAuthType } from './docker-endpoint-authentication.schema'
import { parseRegistryFromImage } from './docker-image.utils'

export interface DockerPullOptions {
  authconfig?: {
    username: string
    password: string
    email?: string
    serveraddress: string
  }
}

export class LocalDockerAdapter implements DockerAdapter {
  private readonly docker: Docker
  private readonly host: string
  private readonly registryAuth: Record<string, DockerRegistryAuth>
  private readonly logger = new Logger(LocalDockerAdapter.name)
  constructor(
    dockerHost: string,
    options: {
      dockerEndpointAuth?: DockerEndpointAuth
      dockerRegistryAuth?: Record<string, DockerRegistryAuth>
    },
  ) {
    this.host = dockerHost
    this.registryAuth = options.dockerRegistryAuth ?? {}
    const isHttpEndpoint = /^https?:\/\//i.test(dockerHost)

    if (isHttpEndpoint) {
      // Parse the URL to extract host and port
      const url = new URL(dockerHost)
      const endpointOptions: Docker.DockerOptions = {
        host: url.hostname,
        port: url.port || (url.protocol === 'https:' ? '443' : '2375'),
        protocol: url.protocol === 'https:' ? 'https' : 'http',
        timeout: 5000,
      }

      // Add authentication if provided
      if (options.dockerEndpointAuth) {
        if (
          options.dockerEndpointAuth.authType === DockerEndpointAuthType.Basic
        ) {
          const credentials = `${options.dockerEndpointAuth.username}:${options.dockerEndpointAuth.password}`
          endpointOptions.headers = {
            Authorization: `Basic ${Buffer.from(credentials).toString('base64')}`,
          }
        } else {
          endpointOptions.headers = {
            Authorization: `Bearer ${options.dockerEndpointAuth.apiKey}`,
          }
        }
      }

      this.docker = new Docker(endpointOptions)
    } else {
      // Unix socket - use the mounted Docker socket directly.
      this.checkSocketPermissions({ socketPath: dockerHost })
      this.docker = new Docker({ socketPath: dockerHost })
    }
  }

  getDescription(): string {
    return `[DOCKERODE]: ${this.host}`
  }

  private async withErrorGuard<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (error: unknown) {
      if (error instanceof DockerAdapterError) {
        throw error
      } else if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          throw new DockerAdapterError(
            DockerAdapterErrorCode.HOST_CONNECTION_ERROR,
            error.message,
            error,
          )
        }
        if (error.message.includes('ETIMEDOUT')) {
          throw new DockerAdapterError(
            DockerAdapterErrorCode.HOST_CONNECTION_TIMEOUT,
            error.message,
            error,
          )
        }
      }
      throw new DockerAdapterError(
        DockerAdapterErrorCode.UNEXPECTED_ERROR,
        String(error),
      )
    }
  }

  /**
   * Check if the Docker socket exists and is accessible.
   * Logs detailed error messages if there are permission issues.
   */
  private checkSocketPermissions({ socketPath }: { socketPath: string }): void {
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

      // Try to access the mounted socket for read/write.
      fs.accessSync(socketPath, fs.constants.R_OK | fs.constants.W_OK)

      this.logger.log(`[Docker] Socket at ${socketPath} is accessible`)
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        const nodeError = error as NodeJS.ErrnoException

        if (nodeError.code === 'EACCES') {
          this.logger.error(
            `[Docker] Permission denied accessing socket at ${socketPath}. ` +
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

  private appendDockerLogEntry(
    entries: DockerLogEntry[],
    stream: DockerLogEntry['stream'],
    chunk: Buffer,
  ) {
    if (!chunk.length) {
      return
    }

    const text = chunk.toString('utf-8')
    if (!text) {
      return
    }

    const lastEntry = entries[entries.length - 1]
    if (lastEntry?.stream === stream) {
      lastEntry.text += text
      return
    }

    entries.push({ stream, text })
  }

  private parseDockerLogBuffer(
    payload: Buffer,
    isTty: boolean,
  ): DockerLogEntry[] {
    const entries: DockerLogEntry[] = []

    if (isTty) {
      this.appendDockerLogEntry(entries, 'stdout', payload)
      return entries
    }

    let offset = 0

    // Docker multiplexed logs have an 8-byte header per frame.
    while (offset + 8 <= payload.length) {
      const streamType = payload[offset]
      const chunkLength = payload.readUInt32BE(offset + 4)
      const chunkStart = offset + 8
      const chunkEnd = chunkStart + chunkLength
      if (chunkEnd > payload.length) {
        break
      }

      const chunk = payload.subarray(chunkStart, chunkEnd)
      if (streamType === 2) {
        this.appendDockerLogEntry(entries, 'stderr', chunk)
      } else {
        this.appendDockerLogEntry(entries, 'stdout', chunk)
      }

      offset = chunkEnd
    }

    if (offset < payload.length) {
      this.appendDockerLogEntry(entries, 'stdout', payload.subarray(offset))
    }

    return entries
  }

  private collectDockerLogEntries(
    stream: NodeJS.ReadableStream,
    isTty: boolean,
  ): Promise<DockerLogEntry[]> {
    return new Promise((resolve, reject) => {
      const entries: DockerLogEntry[] = []
      let pending = Buffer.alloc(0)
      let settled = false

      const finish = () => {
        if (settled) {
          return
        }
        settled = true

        if (!isTty && pending.length) {
          this.appendDockerLogEntry(entries, 'stdout', pending)
        }
        resolve(entries)
      }

      stream.on('error', (error) => {
        if (settled) {
          return
        }
        settled = true
        reject(error instanceof Error ? error : new Error(String(error)))
      })

      stream.on('data', (chunk: Buffer | string) => {
        const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)

        if (isTty) {
          this.appendDockerLogEntry(entries, 'stdout', bufferChunk)
          return
        }

        pending = Buffer.concat([pending, bufferChunk])

        while (pending.length >= 8) {
          const streamType = pending[0]
          const chunkLength = pending.readUInt32BE(4)
          const frameSize = 8 + chunkLength
          if (pending.length < frameSize) {
            break
          }

          const payload = pending.subarray(8, frameSize)
          if (streamType === 2) {
            this.appendDockerLogEntry(entries, 'stderr', payload)
          } else {
            this.appendDockerLogEntry(entries, 'stdout', payload)
          }

          pending = pending.subarray(frameSize)
        }
      })

      stream.on('end', finish)
      stream.on('close', finish)
    })
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

  async getHostResources(): Promise<DockerHostResources> {
    return this.withErrorGuard(async () => {
      const info: unknown = await this.docker.info()
      const sanitizedInfo = convertUnknownToJsonSerializableObject(info, {
        mode: 'recursive',
        throwErrors: false,
      })
      if (!sanitizedInfo) {
        return { info: {} }
      }
      return {
        cpuCores:
          typeof sanitizedInfo.NCPU === 'number'
            ? sanitizedInfo.NCPU
            : undefined,
        memoryBytes:
          typeof sanitizedInfo.MemTotal === 'number'
            ? sanitizedInfo.MemTotal
            : undefined,
        info: sanitizedInfo,
      }
    })
  }

  async getContainerStats(containerId: string): Promise<DockerContainerStats> {
    return this.withErrorGuard(async () => {
      const container = this.docker.getContainer(containerId)
      const stats = await container.stats({ stream: false })
      const cpuStats = stats.cpu_stats
      const preCpuStats = stats.precpu_stats
      const cpuDelta =
        cpuStats.cpu_usage.total_usage && preCpuStats.cpu_usage.total_usage
          ? cpuStats.cpu_usage.total_usage - preCpuStats.cpu_usage.total_usage
          : undefined
      const systemDelta =
        cpuStats.system_cpu_usage && preCpuStats.system_cpu_usage
          ? cpuStats.system_cpu_usage - preCpuStats.system_cpu_usage
          : undefined
      const cpuCount =
        typeof cpuStats.online_cpus === 'number'
          ? cpuStats.online_cpus
          : cpuStats.cpu_usage.percpu_usage.length

      const cpuPercent =
        cpuDelta && systemDelta && cpuCount
          ? (cpuDelta / systemDelta) * cpuCount * 100
          : undefined

      const memoryStats = stats.memory_stats
      const rawUsage =
        typeof memoryStats.usage === 'number' ? memoryStats.usage : undefined
      const cache =
        typeof memoryStats.stats.cache === 'number'
          ? memoryStats.stats.cache
          : 0
      const memoryBytes =
        rawUsage !== undefined ? Math.max(rawUsage - cache, 0) : undefined
      const memoryLimitBytes =
        typeof memoryStats.limit === 'number' ? memoryStats.limit : undefined
      const memoryPercent =
        memoryBytes !== undefined && memoryLimitBytes
          ? (memoryBytes / memoryLimitBytes) * 100
          : undefined

      return {
        cpuPercent,
        memoryBytes,
        memoryLimitBytes,
        memoryPercent,
      }
    })
  }

  async getContainerInspect(
    containerId: string,
  ): Promise<ContainerInspectInfo> {
    return this.withErrorGuard(async () => {
      const container = this.docker.getContainer(containerId)
      return container.inspect()
    })
  }

  async pullImage(image: string, options: DockerPullOptions): Promise<void> {
    this.logger.log(`[Docker] Pulling image: ${image}`)

    await this.withErrorGuard(async () => {
      try {
        const stream = await this.docker.pull(image, options)
        // Wait for the pull to complete by consuming the stream
        await new Promise<void>((resolve, reject) => {
          this.docker.modem.followProgress(
            stream,
            (err: unknown) => {
              if (err) {
                reject(
                  // eslint-disable-next-line @typescript-eslint/no-base-to-string
                  new Error(err instanceof Error ? err.message : String(err)),
                )
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
      } catch (error) {
        let thrownError: DockerAdapterError
        if (
          error &&
          typeof error === 'object' &&
          'statusCode' in error &&
          error.statusCode === 404
        ) {
          thrownError = new DockerAdapterError(
            DockerAdapterErrorCode.IMAGE_NOT_FOUND,
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : // eslint-disable-next-line @typescript-eslint/no-base-to-string
                String(error),
            error instanceof Error ? error : undefined,
          )
        } else {
          thrownError = new DockerAdapterError(
            DockerAdapterErrorCode.IMAGE_PULL_ERROR,
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : error instanceof Error
                ? error.message
                : String(error),
            error instanceof Error ? error : undefined,
          )
        }

        throw thrownError
      }
    })
  }

  async listContainersByLabels(
    labels: Record<string, string>,
  ): Promise<ContainerInfo[]> {
    const labelFilters = Object.entries(labels).map(
      ([key, value]) => `${key}=${value}`,
    )

    const containers = await this.withErrorGuard(() =>
      this.docker.listContainers({
        all: true,
        filters: { label: labelFilters },
      }),
    )

    return containers.map((container) => {
      const state = this.mapContainerState(container.State)
      return {
        id: container.Id,
        image: container.Image,
        labels: container.Labels,
        state,
        reusable: state !== 'unknown',
        createdAt: new Date(container.Created * 1000).toISOString(),
      }
    })
  }

  async getContainerLogs(
    containerId: string,
    options?: { tail?: number },
  ): Promise<DockerLogEntry[]> {
    return this.withErrorGuard(async () => {
      const container = this.docker.getContainer(containerId)
      const inspection = await container.inspect()
      const isTty = Boolean(inspection.Config.Tty)
      const stream = (await container.logs({
        stdout: true,
        stderr: true,
        follow: false,
        tail: options?.tail ?? 200,
      })) as NodeJS.ReadableStream | Buffer

      if (Buffer.isBuffer(stream)) {
        return this.parseDockerLogBuffer(stream, isTty)
      }

      return this.collectDockerLogEntries(stream, isTty)
    })
  }

  async imageExists(image: string) {
    return this.withErrorGuard(() =>
      this.docker.getImage(image).inspect(),
    ).then(
      () => true,
      () => false,
    )
  }

  async createContainer(
    options: FindOrCreateContainerOptions,
  ): Promise<ContainerInfo> {
    const imageExists = await this.imageExists(options.image)
    if (!imageExists) {
      const registryUrl = parseRegistryFromImage(options.image)
      const registryAuth = this.registryAuth[registryUrl]
      await this.pullImage(options.image, {
        authconfig: registryAuth
          ? {
              username: registryAuth.username,
              password: registryAuth.password,
              email: registryAuth.email,
              serveraddress: registryAuth.serverAddress,
            }
          : undefined,
      })
    }

    const createContainerOptions: Docker.ContainerCreateOptions = {
      Image: options.image,
      Env: options.env
        ? Object.entries(options.env).map(([key, value]) => `${key}=${value}`)
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

    const container = await this.withErrorGuard(() =>
      this.docker.createContainer(createContainerOptions),
    )

    await container.start()

    return {
      id: container.id,
      image: options.image,
      labels: options.labels,
      state: 'running',
      reusable: true,
      createdAt: new Date().toISOString(),
    }
  }

  private async execInContainerAndCapture(
    containerId: string,
    command: string[],
    options?: {
      env?: Record<string, string>
    },
  ): Promise<{
    getError: () => Promise<DockerAdapterError>
    state: DockerStateFunc
    output: () => { stdout: string; stderr: string }
  }> {
    const container = this.docker.getContainer(containerId)

    const exec = await this.withErrorGuard(() =>
      container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false, // must be false to demux
        Env: options?.env
          ? Object.entries(options.env).map(([k, v]) => `${k}=${v}`)
          : undefined,
      }),
    )

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
  ): DockerAdapterError {
    if (state.ExitCode === 0) {
      throw new Error(`getError called for non-failed exec`)
    }

    if (stderr.includes('argument list too long')) {
      return new DockerAdapterError(
        DockerAdapterErrorCode.COMMAND_ARGUMENT_LIST_TOO_LONG,
        stderr,
      )
    }

    return new DockerAdapterError(
      DockerAdapterErrorCode.UNEXPECTED_ERROR,
      stderr,
    )
  }

  async execInContainer(
    containerId: string,
    command: string[],
    options: ContainerExecuteOptions,
  ) {
    return this.execInContainerAndCapture(containerId, command, options)
  }

  async execTty(
    containerId: string,
    command: string[],
    options?: { cols?: number; rows?: number; env?: Record<string, string> },
  ): Promise<DockerTtyStream> {
    const container = this.docker.getContainer(containerId)

    const cols = options?.cols ?? 80
    const rows = options?.rows ?? 24

    const exec = await this.withErrorGuard(() =>
      container.exec({
        Cmd: command,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        ConsoleSize: [rows, cols],
        Env: options?.env
          ? Object.entries(options.env).map(([k, v]) => `${k}=${v}`)
          : undefined,
      }),
    )

    // Bun's HTTP client doesn't fire the 'upgrade' event that dockerode's
    // hijack mode relies on (Node.js http.request upgrade → 101 Switching
    // Protocols). Work around this by opening a raw Unix socket to the
    // Docker daemon, sending the POST /exec/{id}/start request ourselves,
    // reading the 101 response, and then using the socket as a duplex stream.
    const execId = (exec as unknown as { id: string }).id
    const stream = await new Promise<net.Socket>((resolve, reject) => {
      let settled = false
      const socket = net.createConnection({ path: this.host }, () => {
        const body = JSON.stringify({ Tty: true })
        const request = [
          `POST /exec/${execId}/start HTTP/1.1`,
          'Host: localhost',
          'Content-Type: application/json',
          `Content-Length: ${Buffer.byteLength(body)}`,
          'Connection: Upgrade',
          'Upgrade: tcp',
          '',
          body,
        ].join('\r\n')
        socket.write(request)
      })

      const timeout = setTimeout(() => {
        if (settled) {
          return
        }
        settled = true
        socket.destroy()
        reject(
          new Error(`Timed out after 10000ms while starting TTY exec stream`),
        )
      }, 10000)

      let headerBuf = ''
      const onData = (chunk: Buffer) => {
        headerBuf += chunk.toString()
        const headerEnd = headerBuf.indexOf('\r\n\r\n')
        if (headerEnd === -1) {
          return
        }
        clearTimeout(timeout)
        settled = true
        socket.removeListener('data', onData)

        const statusLine = headerBuf.slice(0, headerBuf.indexOf('\r\n'))
        if (!statusLine.includes('101')) {
          socket.destroy()
          reject(new Error(`Docker exec.start failed: ${statusLine}`))
          return
        }

        // Any data after the headers is already PTY output
        const remainder = headerBuf.slice(headerEnd + 4)
        if (remainder.length > 0) {
          socket.unshift(Buffer.from(remainder))
        }

        resolve(socket)
      }

      socket.on('data', onData)
      socket.on('error', (err) => {
        clearTimeout(timeout)
        if (settled) {
          return
        }
        settled = true
        reject(err)
      })
    })

    // With Tty=true, dockerode returns a raw stream (no demux needed).
    // The stream is a Duplex: write to it for stdin, read from it for stdout+stderr merged.

    return {
      write: (data: string | Buffer) => {
        if (typeof stream.write === 'function') {
          stream.write(typeof data === 'string' ? Buffer.from(data) : data)
          return
        }
        this.logger.warn(
          `[Docker] ignoring terminal input because stream is not writable for container ${containerId}`,
        )
      },
      onData: (handler: (data: Buffer) => void) => {
        stream.on('data', (chunk: Buffer | string) => {
          handler(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
      },
      onEnd: (handler: () => void) => {
        stream.on('end', handler)
        stream.on('close', handler)
      },
      resize: async (newCols: number, newRows: number) => {
        await exec.resize({ h: newRows, w: newCols })
      },
      destroy: () => {
        stream.destroy()
      },
    }
  }

  async execPipe(
    containerId: string,
    command: string[],
    options?: { env?: Record<string, string> },
  ): Promise<DockerPipeStream> {
    const container = this.docker.getContainer(containerId)

    const exec = await this.withErrorGuard(() =>
      container.exec({
        Cmd: command,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        Env: options?.env
          ? Object.entries(options.env).map(([k, v]) => `${k}=${v}`)
          : undefined,
      }),
    )

    // Same Bun raw-socket workaround as execTty — Bun's HTTP client doesn't
    // fire the 'upgrade' event that dockerode's hijack mode relies on.
    const execId = (exec as unknown as { id: string }).id
    const stream = await new Promise<net.Socket>((resolve, reject) => {
      let settled = false
      const socket = net.createConnection({ path: this.host }, () => {
        const body = JSON.stringify({ Tty: false })
        const request = [
          `POST /exec/${execId}/start HTTP/1.1`,
          'Host: localhost',
          'Content-Type: application/json',
          `Content-Length: ${Buffer.byteLength(body)}`,
          'Connection: Upgrade',
          'Upgrade: tcp',
          '',
          body,
        ].join('\r\n')
        socket.write(request)
      })

      const timeout = setTimeout(() => {
        if (settled) {
          return
        }
        settled = true
        socket.destroy()
        reject(
          new Error(`Timed out after 10000ms while starting pipe exec stream`),
        )
      }, 10000)

      let headerBuf = ''
      const onData = (chunk: Buffer) => {
        headerBuf += chunk.toString()
        const headerEnd = headerBuf.indexOf('\r\n\r\n')
        if (headerEnd === -1) {
          return
        }
        clearTimeout(timeout)
        settled = true
        socket.removeListener('data', onData)

        const statusLine = headerBuf.slice(0, headerBuf.indexOf('\r\n'))
        if (!statusLine.includes('101')) {
          socket.destroy()
          reject(new Error(`Docker exec.start failed: ${statusLine}`))
          return
        }

        // Any data after the headers is already multiplexed output
        const remainder = headerBuf.slice(headerEnd + 4)
        if (remainder.length > 0) {
          socket.unshift(Buffer.from(remainder))
        }

        resolve(socket)
      }

      socket.on('data', onData)
      socket.on('error', (err) => {
        clearTimeout(timeout)
        if (settled) {
          return
        }
        settled = true
        reject(err)
      })
    })

    // With Tty=false, Docker multiplexes stdout/stderr with 8-byte header frames:
    //   [stream_type: 1 byte][padding: 3 bytes][payload_length: 4 bytes BE][payload]
    //   stream_type: 1 = stdout, 2 = stderr
    let stdoutHandler: ((data: Buffer) => void) | null = null
    let stderrHandler: ((data: Buffer) => void) | null = null
    let endHandler: (() => void) | null = null
    let pending = Buffer.alloc(0)

    stream.on('data', (chunk: Buffer | string) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      pending = Buffer.concat([pending, buf])

      while (pending.length >= 8) {
        const streamType = pending[0]
        const payloadLength = pending.readUInt32BE(4)
        const frameSize = 8 + payloadLength
        if (pending.length < frameSize) {
          break // partial frame, wait for more data
        }

        const payload = pending.subarray(8, frameSize)
        pending = pending.subarray(frameSize)

        if (streamType === 2) {
          stderrHandler?.(Buffer.from(payload))
        } else {
          stdoutHandler?.(Buffer.from(payload))
        }
      }
    })

    const handleEnd = () => {
      if (pending.length > 0) {
        stdoutHandler?.(Buffer.from(pending))
        pending = Buffer.alloc(0)
      }
      endHandler?.()
    }

    stream.on('end', handleEnd)
    stream.on('close', handleEnd)

    return {
      write: (data: string | Buffer) => {
        if (typeof stream.write === 'function') {
          stream.write(typeof data === 'string' ? Buffer.from(data) : data)
          return
        }
        this.logger.warn(
          `[Docker] ignoring pipe input because stream is not writable for container ${containerId}`,
        )
      },
      onStdout: (handler: (data: Buffer) => void) => {
        stdoutHandler = handler
      },
      onStderr: (handler: (data: Buffer) => void) => {
        stderrHandler = handler
      },
      onEnd: (handler: () => void) => {
        endHandler = handler
      },
      destroy: () => {
        stream.destroy()
      },
    }
  }

  async startContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId)
    await this.withErrorGuard(async () => {
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
    })
  }

  async stopContainer(containerId: string): Promise<void> {
    await this.withErrorGuard(async () => {
      await this.docker.getContainer(containerId).stop()
    })
  }

  async restartContainer(containerId: string): Promise<void> {
    await this.withErrorGuard(async () => {
      await this.docker.getContainer(containerId).restart()
    })
  }

  async removeContainer(
    containerId: string,
    options?: { force?: boolean },
  ): Promise<void> {
    await this.withErrorGuard(async () => {
      await this.docker
        .getContainer(containerId)
        .remove({ force: options?.force ?? false })
    })
  }

  async isContainerRunning(containerId: string): Promise<boolean> {
    try {
      const container = this.docker.getContainer(containerId)
      const info = await this.withErrorGuard(() => container.inspect())
      return info.State.Running
    } catch {
      return false
    }
  }
}
