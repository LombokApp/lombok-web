import net from 'node:net'

import Dockerode from 'dockerode'

import type {
  BridgeContainerInfo,
  ConnectionTestResult,
  ContainerInfo,
  ContainerStats,
  CreateContainerOptions,
  DockerAdapter,
  ExecInspect,
  ExecOptions,
  HostResources,
  LogEntry,
  PullImageOptions,
  StartExecOptions,
} from './adapter.js'
import { createDemuxer } from './demux.js'

export class DockerodeAdapter implements DockerAdapter {
  private readonly docker: Dockerode
  /**
   * For Unix sockets: the socket path (e.g. '/var/run/docker.sock').
   * For TCP hosts: { host, port } parsed from the URL.
   */
  private readonly endpoint: string | { host: string; port: number }

  constructor(hostString: string) {
    if (
      hostString.startsWith('http://') ||
      hostString.startsWith('https://') ||
      hostString.startsWith('tcp://')
    ) {
      const url = new URL(hostString.replace(/^tcp:/, 'http:'))
      const host = url.hostname
      const port = parseInt(url.port, 10) || 2375
      this.endpoint = { host, port }
      this.docker = new Dockerode({
        host,
        port,
        protocol: url.protocol === 'https:' ? 'https' : 'http',
      })
    } else {
      this.endpoint = hostString
      this.docker = new Dockerode({ socketPath: hostString })
    }
  }

  async createExec(
    containerId: string,
    cmd: string[],
    opts: ExecOptions,
  ): Promise<string> {
    const container = this.docker.getContainer(containerId)
    const exec = await container.exec({
      Cmd: cmd,
      Tty: opts.tty,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Env: opts.env,
      WorkingDir: opts.workingDir,
    })
    return exec.id
  }

  /**
   * Start an exec instance and return a raw net.Socket.
   *
   * Bun's HTTP client does not fire the 'upgrade' event that dockerode's
   * hijack mode relies on. We work around this by opening a raw Unix socket
   * to the Docker daemon, sending the POST /exec/{id}/start request ourselves,
   * reading the 101 response, and then using the socket as a duplex stream.
   */
  async startExec(execId: string, opts: StartExecOptions): Promise<net.Socket> {
    const endpoint = this.endpoint

    return new Promise<net.Socket>((resolve, reject) => {
      let settled = false

      const connectOpts =
        typeof endpoint === 'string'
          ? { path: endpoint }
          : { host: endpoint.host, port: endpoint.port }

      const socket = net.createConnection(connectOpts, () => {
        const body = JSON.stringify({
          Tty: opts.tty,
          Detach: false,
        })
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
        reject(new Error('Timed out after 10000ms while starting exec stream'))
      }, 10000)

      const headerChunks: Buffer[] = []
      let headerLen = 0
      const HEADER_SEPARATOR = Buffer.from('\r\n\r\n')
      const onData = (chunk: Buffer) => {
        headerChunks.push(chunk)
        headerLen += chunk.length
        const combined = Buffer.concat(headerChunks, headerLen)
        const headerEnd = combined.indexOf(HEADER_SEPARATOR)
        if (headerEnd === -1) {
          return
        }

        clearTimeout(timeout)
        settled = true
        socket.removeListener('data', onData)

        const firstLineEnd = combined.indexOf(Buffer.from('\r\n'))
        const statusLine = combined
          .subarray(0, firstLineEnd === -1 ? headerEnd : firstLineEnd)
          .toString('ascii')
        if (!statusLine.includes('101')) {
          socket.destroy()
          reject(new Error(`Docker exec.start failed: ${statusLine}`))
          return
        }

        // Any data after the headers is already exec output — push back as raw Buffer
        const remainder = combined.subarray(headerEnd + 4)
        if (remainder.length > 0) {
          socket.unshift(remainder)
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
  }

  async resizeExec(execId: string, cols: number, rows: number): Promise<void> {
    const exec = this.docker.getExec(execId)
    await exec.resize({ h: rows, w: cols })
  }

  async inspectExec(execId: string): Promise<ExecInspect> {
    const exec = this.docker.getExec(execId)
    const info = await exec.inspect()
    return {
      running: info.Running,
      exitCode: info.ExitCode ?? null,
      pid: info.Pid,
    }
  }

  async listContainers(): Promise<ContainerInfo[]> {
    const containers = await this.docker.listContainers({ all: true })
    return containers.map((c) => ({
      id: c.Id,
      names: c.Names,
      state: c.State,
    }))
  }

  /**
   * Kill an exec process by sending kill -9 to the PID inside the container.
   * Docker has no native kill-exec API, so we exec kill inside the container.
   * Falls back to logging if the kill command fails.
   */
  async killExec(containerId: string, execPid: number): Promise<void> {
    try {
      const killExecId = await this.createExec(
        containerId,
        ['kill', '-9', String(execPid)],
        { tty: false },
      )
      const stream = await this.startExec(killExecId, {
        tty: false,
        stdin: false,
      })
      // Wait for the kill command to complete
      await new Promise<void>((resolve) => {
        stream.on('end', resolve)
        stream.on('close', resolve)
        stream.on('error', resolve)
      })
    } catch {
      // Kill command failed — nothing more we can do
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.docker.ping()
      return true
    } catch {
      return false
    }
  }

  async execSync(
    containerId: string,
    command: string[],
    options?: { env?: string[] },
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const execId = await this.createExec(containerId, command, {
      tty: false,
      env: options?.env,
    })
    const stream = await this.startExec(execId, { tty: false, stdin: false })

    // Collect output with demuxing (tty=false uses Docker's 8-byte header protocol)
    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []

    await new Promise<void>((resolve) => {
      const demux = createDemuxer(
        (data) => stdoutChunks.push(data),
        (data) => stderrChunks.push(data),
      )

      stream.on('data', (chunk: Buffer) => demux(chunk))
      stream.on('end', resolve)
      stream.on('close', resolve)
      stream.on('error', resolve)
    })

    const info = await this.inspectExec(execId)

    return {
      stdout: Buffer.concat(stdoutChunks).toString('utf8'),
      stderr: Buffer.concat(stderrChunks).toString('utf8'),
      exitCode: info.exitCode ?? -1,
    }
  }

  async createContainer(
    options: CreateContainerOptions,
  ): Promise<BridgeContainerInfo> {
    const hostConfig: Dockerode.HostConfig = {
      ExtraHosts: options.extraHosts,
      Binds: options.volumes,
      NetworkMode: options.networkMode,
      CapAdd: options.capAdd,
      CapDrop: options.capDrop,
      SecurityOpt: options.securityOpt,
      Privileged: options.privileged,
      ReadonlyRootfs: options.readOnly,
      ShmSize: options.shmSize,
      Tmpfs: options.tmpfs,
      Devices: options.devices?.map((d) => {
        const [hostPath, containerPath, permissions] = d.split(':')
        return {
          PathOnHost: hostPath ?? '',
          PathInContainer: containerPath ?? hostPath ?? '',
          CgroupPermissions: permissions ?? 'rwm',
        }
      }),
      Dns: options.dns,
      DnsSearch: options.dnsSearch,
      IpcMode: options.ipcMode,
      PidMode: options.pidMode,
      CgroupParent: options.cgroupParent,
      Memory: options.memoryLimit,
      CpuShares: options.cpuShares,
      CpuQuota: options.cpuQuota,
      PidsLimit: options.pidsLimit,
      Runtime: options.runtime,
      Sysctls: options.sysctls,
    }

    if (options.restartPolicy) {
      hostConfig.RestartPolicy = {
        Name: options.restartPolicy,
        ...(options.restartPolicy === 'on-failure'
          ? { MaximumRetryCount: 5 }
          : {}),
      }
    }

    if (options.ports) {
      const exposedPorts: Record<string, object> = {}
      const portBindings: Record<string, { HostPort: string }[]> = {}
      for (const p of options.ports) {
        const key = `${p.container}/${p.protocol}`
        exposedPorts[key] = {}
        portBindings[key] = [{ HostPort: String(p.host) }]
      }
      hostConfig.PortBindings = portBindings
    }

    if (options.ulimits) {
      hostConfig.Ulimits = Object.entries(options.ulimits).map(
        ([name, { soft, hard }]) => ({ Name: name, Soft: soft, Hard: hard }),
      )
    }

    if (options.gpus) {
      hostConfig.DeviceRequests = [
        {
          Driver: options.gpus.driver,
          DeviceIDs: options.gpus.deviceIds,
          Capabilities: [['gpu']],
        },
      ]
    }

    const createOpts: Dockerode.ContainerCreateOptions = {
      Image: options.image,
      Labels: options.labels,
      Env: options.env
        ? Object.entries(options.env).map(([k, v]) => `${k}=${v}`)
        : undefined,
      Entrypoint: options.entrypoint,
      Cmd: options.command,
      WorkingDir: options.workingDir,
      User: options.user,
      Hostname: options.hostname,
      Domainname: options.domainName,
      StopSignal: options.stopSignal,
      StopTimeout: options.stopTimeout,
      ExposedPorts: options.ports
        ? Object.fromEntries(
            options.ports.map((p) => [`${p.container}/${p.protocol}`, {}]),
          )
        : undefined,
      HostConfig: hostConfig,
    }

    const container = await this.docker.createContainer(createOpts)
    await container.start()
    const inspect = await container.inspect()

    return {
      id: inspect.Id,
      image: inspect.Config.Image,
      labels: inspect.Config.Labels,
      state: inspect.State.Status,
      reusable: true,
      createdAt: inspect.Created,
      names: [inspect.Name],
    }
  }

  async startContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId)
    await container.start()
  }

  async stopContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId)
    await container.stop()
  }

  async restartContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId)
    await container.restart()
  }

  async removeContainer(
    containerId: string,
    options?: { force?: boolean },
  ): Promise<void> {
    const container = this.docker.getContainer(containerId)
    await container.remove({ force: options?.force })
  }

  async getContainerInspect(containerId: string): Promise<unknown> {
    const container = this.docker.getContainer(containerId)
    return container.inspect()
  }

  async getContainerStats(containerId: string): Promise<ContainerStats> {
    const container = this.docker.getContainer(containerId)
    const stats = (await container.stats({ stream: false })) as {
      cpu_stats: {
        cpu_usage: { total_usage: number }
        system_cpu_usage: number
        online_cpus?: number
      }
      precpu_stats?: {
        cpu_usage?: { total_usage: number }
        system_cpu_usage?: number
      }
      memory_stats: { usage: number; limit: number }
    }

    const cpuDelta =
      stats.cpu_stats.cpu_usage.total_usage -
      (stats.precpu_stats?.cpu_usage?.total_usage ?? 0)
    const systemDelta =
      stats.cpu_stats.system_cpu_usage -
      (stats.precpu_stats?.system_cpu_usage ?? 0)
    const numCpus = stats.cpu_stats.online_cpus ?? 1
    const cpuPercent =
      systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : undefined

    return {
      cpuPercent,
      memoryBytes: stats.memory_stats.usage,
      memoryLimitBytes: stats.memory_stats.limit,
      memoryPercent:
        stats.memory_stats.limit > 0
          ? (stats.memory_stats.usage / stats.memory_stats.limit) * 100
          : undefined,
    }
  }

  async getContainerLogs(
    containerId: string,
    options?: { tail?: number },
  ): Promise<LogEntry[]> {
    const container = this.docker.getContainer(containerId)
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: options?.tail ?? 100,
      timestamps: false,
    })

    // Docker returns a Buffer with 8-byte headers per frame
    // Parse the multiplexed stream
    const entries: LogEntry[] = []
    const buf = Buffer.isBuffer(logs) ? logs : Buffer.from(logs as string)
    let offset = 0
    while (offset + 8 <= buf.length) {
      const streamType = buf[offset]
      const length = buf.readUInt32BE(offset + 4)
      offset += 8
      if (offset + length > buf.length) {
        break
      }
      const text = buf.subarray(offset, offset + length).toString('utf8')
      entries.push({
        stream: streamType === 2 ? 'stderr' : 'stdout',
        text,
      })
      offset += length
    }
    return entries
  }

  async isContainerRunning(containerId: string): Promise<boolean> {
    try {
      const container = this.docker.getContainer(containerId)
      const inspect = await container.inspect()
      return inspect.State.Running
    } catch {
      return false
    }
  }

  async listContainersByLabels(
    labels: Record<string, string>,
  ): Promise<BridgeContainerInfo[]> {
    const filters = {
      label: Object.entries(labels).map(([k, v]) => `${k}=${v}`),
    }
    const containers = await this.docker.listContainers({
      all: true,
      filters,
    })
    return containers.map((c) => ({
      id: c.Id,
      image: c.Image,
      labels: c.Labels,
      state: c.State,
      reusable: c.State !== 'removing',
      createdAt: new Date(c.Created * 1000).toISOString(),
      names: c.Names,
    }))
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const version = await this.docker.version()
      return {
        success: true,
        version: version.Version,
        apiVersion: version.ApiVersion,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async getHostResources(): Promise<HostResources> {
    const info = (await this.docker.info()) as {
      NCPU: number
      MemTotal: number
    }
    return {
      cpuCores: info.NCPU,
      memoryBytes: info.MemTotal,
      info: info as unknown as Record<string, unknown>,
    }
  }

  async pullImage(image: string, options?: PullImageOptions): Promise<void> {
    const authconfig = options?.registryAuth
      ? {
          username: options.registryAuth.username,
          password: options.registryAuth.password,
          serveraddress: options.registryAuth.serveraddress,
        }
      : undefined

    const stream = await this.docker.pull(image, { authconfig })

    // Wait for pull to complete
    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err: Error | null) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}
