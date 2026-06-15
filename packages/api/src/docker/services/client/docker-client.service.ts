import {
  convertUnknownToJsonSerializableObject,
  JsonSerializableValue,
} from '@lombokapp/types'
import { convertErrorToAsyncWorkError } from '@lombokapp/worker-utils'
import {
  HttpException,
  Inject,
  Injectable,
  Logger,
  Scope,
} from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import type { ContainerInspectInfo } from 'dockerode'
import * as jose from 'jose'
import { coreConfig } from 'src/core/config'

import { DockerSessionDTO } from '../../dto/responses/bridge-observability-responses.dto'
import { DockerBridgeService } from '../docker-bridge.service'
import { DockerHostManagementService } from '../docker-host-management.service'
import { DOCKER_CONTAINER_TYPES, DOCKER_LABELS } from '../docker-jobs.service'
import {
  BridgeHttpError,
  type ConnectionTestResult,
  type ContainerInfo,
  type DockerContainerGpuInfo,
  type DockerContainerStats,
  DockerError,
  type DockerHostResources,
  type DockerLogEntry,
  type DockerPipeStream,
  type DockerTtyStream,
  type FindOrCreateContainerOptions,
} from './docker-client.types'

const BRIDGE_HTTP_URL = 'http://localhost:3100'
const BRIDGE_WS_URL = 'ws://localhost:3101'

/** Session token TTL for private sessions — matches bridge idle timeout (30 min) */
const SESSION_TOKEN_TTL_SECONDS = 1800

/** Session token TTL for public sessions (24 hours) */
const PUBLIC_SESSION_TOKEN_TTL_SECONDS = 86400

interface BridgeSessionResponse {
  id: string
  container_id: string
  state: string
  protocol: string
  public_id: string | null
  label: string
  app_id: string
  agent_ready: boolean
}

interface BridgeContainerInfo {
  id: string
  image: string
  labels: Record<string, string>
  state: string
  reusable: boolean
  createdAt: string
  names: string[]
}

function toBridgeContainerInfo(c: BridgeContainerInfo): ContainerInfo {
  return {
    id: c.id,
    image: c.image,
    labels: c.labels,
    state: (['running', 'exited', 'paused', 'created'].includes(c.state)
      ? c.state
      : 'unknown') as ContainerInfo['state'],
    reusable: c.reusable,
    createdAt: c.createdAt,
  }
}

/** Full bridge session payload as returned by GET /sessions (snake_case). */
interface BridgeSessionFull {
  id: string
  container_id: string
  host_id: string | null
  mode: string
  state: string
  protocol: string
  tty: boolean
  command: string[]
  agent_ready: boolean
  public_id: string | null
  label: string
  app_id: string | null
  client_count: number
  created_at: number
  last_activity_at: number
}

function toDockerSessionDTO(s: BridgeSessionFull): DockerSessionDTO {
  return {
    id: s.id,
    containerId: s.container_id,
    hostId: s.host_id,
    mode: s.mode,
    state: s.state,
    protocol: s.protocol,
    tty: s.tty,
    command: s.command,
    agentReady: s.agent_ready,
    publicId: s.public_id,
    label: s.label,
    appId: s.app_id,
    clientCount: s.client_count,
    createdAt: s.created_at,
    lastActivityAt: s.last_activity_at,
  }
}

export interface TunnelSessionDetails {
  sessionId: string
  token: string
  urls: {
    ws: string
    http: string
  }
  public?: {
    id: string
    url: string
  }
}

@Injectable({ scope: Scope.DEFAULT })
export class DockerClientService {
  private readonly logger = new Logger(DockerClientService.name)

  constructor(
    @Inject(coreConfig.KEY)
    private readonly config: ConfigType<typeof coreConfig>,
    private readonly dockerBridgeService: DockerBridgeService,
    private readonly dockerHostManagementService: DockerHostManagementService,
  ) {}

  // ---------------------------------------------------------------------------
  // Bridge HTTP helper
  // ---------------------------------------------------------------------------

  private async bridgeRequest<T>(
    method: string,
    path: string,
    body?: JsonSerializableValue,
    queryParams?: Record<string, string>,
  ): Promise<T> {
    const secret = this.dockerBridgeService.getSecret()
    const url = new URL(path, BRIDGE_HTTP_URL)
    if (queryParams) {
      for (const [k, v] of Object.entries(queryParams)) {
        url.searchParams.set(k, v)
      }
    }
    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => ({
        error: response.statusText,
      }))) as { error?: string }
      throw new BridgeHttpError(
        `Bridge ${method} ${path} failed (${response.status}): ${error.error ?? response.statusText}`,
        response.status,
      )
    }

    if (response.status === 204) {
      return undefined as T
    }
    return response.json() as Promise<T>
  }

  // ---------------------------------------------------------------------------
  // Docker operations — each calls the bridge HTTP API directly
  // ---------------------------------------------------------------------------

  async testHostConnection(hostId: string): Promise<ConnectionTestResult> {
    return this.bridgeRequest('GET', `/docker/${hostId}/test`)
  }

  async testAllHostConnections(): Promise<
    Record<string, { result: ConnectionTestResult; id: string }>
  > {
    const results: Record<
      string,
      { result: ConnectionTestResult; id: string }
    > = {}
    const hosts = await this.dockerHostManagementService.listHosts()
    for (const host of hosts) {
      if (!host.enabled) {
        continue
      }
      results[host.id] = {
        id: `[BRIDGE]: ${host.id}`,
        result: await this.testHostConnection(host.id),
      }
    }
    return results
  }

  getHostDescription(hostId: string): string {
    return `[BRIDGE]: ${hostId}`
  }

  async listContainersByLabels(
    hostId: string,
    labels: Record<string, string>,
  ): Promise<ContainerInfo[]> {
    const result = await this.bridgeRequest<BridgeContainerInfo[]>(
      'GET',
      `/docker/${hostId}/containers`,
      undefined,
      { labels: JSON.stringify(labels) },
    )
    return result.map(toBridgeContainerInfo)
  }

  async createContainer(
    hostId: string,
    options: FindOrCreateContainerOptions,
  ): Promise<ContainerInfo> {
    const { ...createPayload } = options
    const result = await this.bridgeRequest<BridgeContainerInfo>(
      'POST',
      `/docker/${hostId}/containers`,
      // Typed nested objects (mounts, ports, gpus) are JSON-serializable at runtime but don't satisfy JsonSerializableValue's index signature.
      createPayload,
    )
    return toBridgeContainerInfo(result)
  }

  async getContainerLogs(
    hostId: string,
    containerId: string,
    options?: { tail?: number },
  ): Promise<DockerLogEntry[]> {
    return this.bridgeRequest(
      'GET',
      `/docker/${hostId}/containers/${containerId}/logs`,
      undefined,
      { tail: String(options?.tail ?? 100) },
    )
  }

  async getHostResources(hostId: string): Promise<DockerHostResources> {
    return this.bridgeRequest('GET', `/docker/${hostId}/resources`)
  }

  async getContainerStats(
    hostId: string,
    containerId: string,
  ): Promise<DockerContainerStats> {
    return this.bridgeRequest(
      'GET',
      `/docker/${hostId}/containers/${containerId}/stats`,
    )
  }

  async getContainerInspect(
    hostId: string,
    containerId: string,
  ): Promise<ContainerInspectInfo> {
    return this.bridgeRequest(
      'GET',
      `/docker/${hostId}/containers/${containerId}/inspect`,
    )
  }

  async getContainerGpuInfo(
    hostId: string,
    containerId: string,
    inspect?: ContainerInspectInfo,
  ): Promise<DockerContainerGpuInfo | undefined> {
    interface InspectShape {
      HostConfig?: {
        DeviceRequests?: {
          Driver?: string
          Capabilities?: string[][]
          DeviceIDs?: string[]
        }[]
        Devices?: {
          PathOnHost?: string
          PathInContainer?: string
        }[]
        Runtime?: string
      }
      State?: {
        Running?: boolean
      }
    }

    const inspection =
      inspect ?? (await this.getContainerInspect(hostId, containerId))
    const inspectData = inspection as InspectShape
    const deviceRequests = Array.isArray(inspectData.HostConfig?.DeviceRequests)
      ? inspectData.HostConfig.DeviceRequests
      : []
    const devices = Array.isArray(inspectData.HostConfig?.Devices)
      ? inspectData.HostConfig.Devices
      : []

    const gpuRequest = deviceRequests.find((request) => {
      const caps = request.Capabilities
      return Array.isArray(caps) && caps.some((cap) => cap.includes('gpu'))
    })
    const hasNvidiaRequest = deviceRequests.some(
      (request) => request.Driver === 'nvidia',
    )
    const hasNvidiaRuntime = inspectData.HostConfig?.Runtime === 'nvidia'
    const hasNvidiaDevice = devices.some((device) =>
      /nvidia/i.test(device.PathOnHost ?? ''),
    )
    const hasGpu =
      Boolean(gpuRequest) ||
      hasNvidiaDevice ||
      hasNvidiaRuntime ||
      hasNvidiaRequest
    if (!hasGpu) {
      return undefined
    }

    const driver =
      gpuRequest?.Driver ??
      deviceRequests.find((request) => request.Driver)?.Driver ??
      (hasNvidiaDevice || hasNvidiaRuntime || hasNvidiaRequest
        ? 'nvidia'
        : undefined)

    if (!inspectData.State?.Running) {
      return {
        driver,
        error: 'Container is not running.',
      }
    }

    if (driver && driver !== 'nvidia') {
      return {
        driver,
        error: 'GPU introspection is only supported for NVIDIA devices.',
      }
    }

    const command = ['nvidia-smi', '-L']
    try {
      const exec = await this.execInContainer(hostId, containerId, command)
      if (exec.exitCode === 0) {
        const output = exec.stdout.trim()
        return {
          driver: driver ?? 'nvidia',
          command: command.join(' '),
          output: output.length ? output : undefined,
        }
      }

      throw new DockerError(
        'EXEC_FAILED',
        `Failed to run nvidia-smi...\n${exec.stderr}`,
      )
    } catch (error) {
      return {
        driver: driver ?? 'nvidia',
        command: command.join(' '),
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async startContainer(hostId: string, containerId: string): Promise<void> {
    await this.bridgeRequest(
      'POST',
      `/docker/${hostId}/containers/${containerId}/start`,
    )
  }

  async stopContainer(hostId: string, containerId: string): Promise<void> {
    await this.bridgeRequest(
      'POST',
      `/docker/${hostId}/containers/${containerId}/stop`,
    )
  }

  async restartContainer(hostId: string, containerId: string): Promise<void> {
    await this.bridgeRequest(
      'POST',
      `/docker/${hostId}/containers/${containerId}/restart`,
    )
  }

  async removeContainer(
    hostId: string,
    containerId: string,
    options?: { force?: boolean },
  ): Promise<void> {
    await this.bridgeRequest(
      'POST',
      `/docker/${hostId}/containers/${containerId}/remove`,
      { force: options?.force ? true : null },
    )
  }

  async pullImage(
    hostId: string,
    image: string,
    authconfig?: {
      username: string
      password: string
      email?: string
      serveraddress: string
    },
  ): Promise<void> {
    await this.bridgeRequest('POST', `/docker/${hostId}/images/pull`, {
      image,
      registry_auth: authconfig ?? null,
    })
  }

  async execInContainer(
    hostId: string,
    containerId: string,
    command: string[],
    options?: {
      env?: Record<string, string>
      user?: string
    },
  ): Promise<{
    exitCode: number
    stdout: string
    stderr: string
  }> {
    const result = await this.bridgeRequest<{
      stdout: string
      stderr: string
      exitCode: number
    }>('POST', `/docker/${hostId}/containers/${containerId}/exec`, {
      command,
      env: options?.env
        ? Object.entries(options.env).map(([k, v]) => `${k}=${v}`)
        : null,
      ...(options?.user && { user: options.user }),
    })

    return result
  }

  async execPipe(
    hostId: string,
    containerId: string,
    command: string[],
    options?: {
      env?: Record<string, string>
    },
  ): Promise<DockerPipeStream> {
    const secret = this.dockerBridgeService.getSecret()
    const env = options?.env ?? {}

    // tty=false yields demuxed stdout/stderr.
    const session = await this.bridgeRequest<{ id: string }>(
      'POST',
      '/sessions/tunnel',
      {
        host_id: hostId,
        container_id: containerId,
        command,
        label: 'pipe',
        app_id: 'internal',
        mode: 'ephemeral',
        protocol: 'raw',
        tty: false,
        env: Object.entries(env).map(([k, v]) => `${k}=${v}`),
      },
    )

    const ws = new WebSocket(
      `${BRIDGE_WS_URL}/sessions/${session.id}/attach?token=${encodeURIComponent(secret)}`,
    )
    ws.binaryType = 'arraybuffer'

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('WS connect timeout')),
        10000,
      )
      ws.addEventListener(
        'open',
        () => {
          clearTimeout(timeout)
          resolve()
        },
        { once: true },
      )
      ws.addEventListener(
        'error',
        (ev) => {
          clearTimeout(timeout)
          reject(new Error(`WS error: ${JSON.stringify(ev)}`))
        },
        { once: true },
      )
    })

    const stdoutHandlers: ((data: Buffer) => void)[] = []
    const stderrHandlers: ((data: Buffer) => void)[] = []
    const endHandlers: (() => void)[] = []
    let destroyed = false

    ws.addEventListener('message', (ev) => {
      if (destroyed) {
        return
      }
      const buf = Buffer.from(ev.data as ArrayBuffer)
      if (buf.length < 2) {
        return
      }

      // First byte is stream type: 0x01=stdout, 0x02=stderr.
      const streamType = buf[0]
      const payload = buf.subarray(1)

      if (streamType === 1) {
        for (const h of stdoutHandlers) {
          h(payload)
        }
      } else if (streamType === 2) {
        for (const h of stderrHandlers) {
          h(payload)
        }
      }
    })

    ws.addEventListener('close', () => {
      if (destroyed) {
        return
      }
      for (const h of endHandlers) {
        h()
      }
    })

    return {
      write: (data: string | Buffer) => {
        if (destroyed || ws.readyState !== WebSocket.OPEN) {
          return
        }
        ws.send(typeof data === 'string' ? data : data)
      },
      onStdout: (handler: (data: Buffer) => void) => {
        stdoutHandlers.push(handler)
      },
      onStderr: (handler: (data: Buffer) => void) => {
        stderrHandlers.push(handler)
      },
      onEnd: (handler: () => void) => {
        endHandlers.push(handler)
      },
      destroy: () => {
        if (destroyed) {
          return
        }
        destroyed = true
        if (ws.readyState === WebSocket.OPEN) {
          ws.close()
        }
        void fetch(`${BRIDGE_HTTP_URL}/sessions/${session.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${secret}` },
        }).catch(() => {
          void 0
        })
      },
    }
  }

  // ---------------------------------------------------------------------------
  // Higher-level container helpers (absorbed from DockerClientService)
  // ---------------------------------------------------------------------------

  private async withErrorGuard<T>(
    fn: () => Promise<T>,
    buildError: (error: unknown) => Error,
  ): Promise<T> {
    try {
      return await fn()
    } catch (error: unknown) {
      throw buildError(error)
    }
  }

  /** Look up registry credentials for an image; undefined if no stored credential matches its registry. */
  private async resolveRegistryAuth(
    image: string,
  ): Promise<
    { username: string; password: string; serveraddress: string } | undefined
  > {
    const authMap = await this.dockerHostManagementService.getRegistryAuthMap()
    if (Object.keys(authMap).length === 0) {
      return undefined
    }

    // Registry is the first path segment if it looks like a host; else Docker Hub.
    const firstSegment = image.split('/')[0] ?? ''
    const hasRegistry = firstSegment.includes('.') || firstSegment.includes(':')
    const registry = hasRegistry ? firstSegment : 'docker.io'

    const cred = authMap[registry]
    if (!cred) {
      return undefined
    }

    return {
      username: cred.username,
      password: cred.password,
      serveraddress: cred.serverAddress,
    }
  }

  private async ensureContainerRunning(
    hostId: string,
    container: ContainerInfo,
  ): Promise<ContainerInfo> {
    if (container.state === 'running') {
      return container
    }

    await this.withErrorGuard(
      async () => this.startContainer(hostId, container.id),
      (error) =>
        convertErrorToAsyncWorkError(
          error instanceof Error ? error : new Error(String(error)),
          {
            name: 'DockerClientError',
            message: `Failed to start container "${container.id}": ${error instanceof Error ? error.message : String(error)}`,
            code: 'START_CONTAINER_FAILED',
            stack: new Error().stack,
            details: { containerId: container.id },
          },
        ),
    )

    return { ...container, state: 'running' }
  }

  async findContainerById(
    hostId: string,
    containerId: string,
    options?: { start?: boolean },
  ): Promise<ContainerInfo | undefined> {
    let containerInspect: ContainerInspectInfo
    try {
      containerInspect = await this.getContainerInspect(hostId, containerId)
    } catch (error: unknown) {
      if (error instanceof BridgeHttpError && error.statusCode === 404) {
        return undefined
      }
      throw convertErrorToAsyncWorkError(
        error instanceof Error ? error : new Error(String(error)),
        {
          name: 'DockerClientError',
          message: `Failed to find container by id "${containerId}": ${error instanceof Error ? error.message : String(error)}`,
          code: 'FIND_CONTAINER_BY_ID_FAILED',
          stack: new Error().stack,
          details: { containerId },
        },
      )
    }

    const state: ContainerInfo['state'] = containerInspect.State.Running
      ? 'running'
      : containerInspect.State.Paused
        ? 'paused'
        : containerInspect.State.Status === 'exited'
          ? 'exited'
          : containerInspect.State.Status === 'created'
            ? 'created'
            : 'unknown'
    const container: ContainerInfo = {
      id: containerInspect.Id,
      image: containerInspect.Config.Image,
      labels: containerInspect.Config.Labels,
      state,
      reusable: !containerInspect.State.Dead,
      createdAt: containerInspect.Created,
    }

    if (options?.start) {
      return this.ensureContainerRunning(hostId, container)
    }

    return container
  }

  async findOrCreateContainer(
    hostId: string,
    options: FindOrCreateContainerOptions,
  ): Promise<ContainerInfo | undefined> {
    const existingContainers = await this.withErrorGuard(
      async () => this.listContainersByLabels(hostId, options.labels),
      (error) => {
        return convertErrorToAsyncWorkError(
          error instanceof Error ? error : new Error(String(error)),
          {
            name: 'DockerClientError',
            origin: 'platform',
            message: `Failed to list containers by labels: ${error instanceof Error ? error.message : String(error)}`,
            code: 'LIST_CONTAINERS_BY_LABELS_FAILED',
            stack: new Error().stack,
            details: {
              labels: options.labels,
            },
          },
        )
      },
    )

    // Exclude containers carrying a userId/isolationKey label the request didn't ask for (requested labels are already exact-matched by Docker's filter).
    const requestedUserId = options.labels[DOCKER_LABELS.USER_ID]
    const requestedIsolationKey = options.labels[DOCKER_LABELS.ISOLATION_KEY]

    const matchingContainers = existingContainers.filter((container) => {
      if (!requestedUserId && container.labels[DOCKER_LABELS.USER_ID]) {
        return false
      }
      if (
        !requestedIsolationKey &&
        container.labels[DOCKER_LABELS.ISOLATION_KEY]
      ) {
        return false
      }
      return true
    })

    const runningContainer = matchingContainers.find(
      (container) => container.state === 'running',
    )

    if (runningContainer) {
      return runningContainer
    }

    const stoppedContainer = matchingContainers.find(
      (container) =>
        container.state === 'exited' || container.state === 'created',
    )

    if (stoppedContainer) {
      if (options.start) {
        return this.ensureContainerRunning(hostId, stoppedContainer)
      }
      return stoppedContainer
    }

    // No reusable container: create one, exposing labels as env vars.
    const createOptions = {
      ...options,
      env: {
        ...options.env,
        ...Object.fromEntries(
          Object.entries(options.labels).map(([key, value]) => [
            key.replace('lombok.', 'LOMBOK_').toUpperCase(),
            value,
          ]),
        ),
      },
    }

    return this.withErrorGuard(
      async () => {
        const registryAuth = await this.resolveRegistryAuth(createOptions.image)
        if (registryAuth) {
          await this.pullImage(hostId, createOptions.image, registryAuth)
        }

        const created = await this.createContainer(hostId, {
          ...createOptions,
          start: true,
        })
        await this.ensureContainerRunning(hostId, created)
        return created
      },
      (error) =>
        convertErrorToAsyncWorkError(
          error instanceof Error ? error : new Error(String(error)),
          {
            name: 'DockerClientError',
            message: `Failed to create container: ${error instanceof Error ? error.message : String(error)}`,
            code: 'CREATE_CONTAINER_FAILED',
            stack: new Error().stack,
            details: {
              containerOptions: convertUnknownToJsonSerializableObject(
                options,
                { throwErrors: false },
              ),
            },
          },
        ),
    )
  }

  // ---------------------------------------------------------------------------
  // Host state
  // ---------------------------------------------------------------------------

  async getDockerHostState(hostId: string): Promise<DockerHostState> {
    let connection: ConnectionTestResult
    try {
      connection = await this.testHostConnection(hostId)
    } catch (error) {
      connection = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }

    let resources: DockerHostResources | undefined
    if (connection.success) {
      try {
        resources = await this.getHostResources(hostId)
      } catch {
        resources = undefined
      }
    }

    let containers: DockerHostContainerState[] = []
    let containersError: string | undefined
    try {
      const rawContainers = await this.listContainersByLabels(hostId, {
        [DOCKER_LABELS.PLATFORM_HOST]: this.config.platformHost,
      })
      containers = rawContainers.map((container): DockerHostContainerState => {
        const isWorker =
          container.labels[DOCKER_LABELS.CONTAINER_TYPE] ===
          DOCKER_CONTAINER_TYPES.WORKER

        if (isWorker) {
          return {
            ...container,
            containerType: 'worker',
            profileId: container.labels[DOCKER_LABELS.PROFILE_ID] ?? '',
            profileHash: container.labels[DOCKER_LABELS.PROFILE_HASH] ?? '',
          }
        }

        return {
          ...container,
          containerType: 'standalone',
          standaloneContainerId:
            container.labels[DOCKER_LABELS.STANDALONE_CONTAINER_ID] ?? '',
        }
      })
    } catch (error) {
      containersError = error instanceof Error ? error.message : String(error)
    }

    return {
      id: hostId,
      description: this.getHostDescription(hostId),
      connection,
      resources,
      containers,
      containersError,
    }
  }

  async getDockerHostStates(): Promise<DockerHostState[]> {
    const hosts = await this.dockerHostManagementService.listHosts()
    const enabledHostIds = hosts.filter((h) => h.enabled).map((h) => h.id)
    return Promise.all(
      enabledHostIds.map((hostId) => this.getDockerHostState(hostId)),
    )
  }

  // ---------------------------------------------------------------------------
  // Tunnel / session management
  // ---------------------------------------------------------------------------

  /** Create a raw tunnel session and return a DockerTtyStream for server-side relay (Socket.IO terminal relay; backend attaches, not the browser). */
  async execTty(
    containerId: string,
    command: string[],
    options?: {
      cols?: number
      rows?: number
      env?: Record<string, string>
      hostId?: string
    },
  ): Promise<DockerTtyStream> {
    const backendToken = this.dockerBridgeService.getSecret()

    const createResponse = await fetch(`${BRIDGE_HTTP_URL}/sessions/tunnel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${backendToken}`,
      },
      body: JSON.stringify({
        container_id: containerId,
        command,
        host_id: options?.hostId,
        label: 'pty',
        app_id: 'internal',
        mode: 'ephemeral',
        protocol: 'raw',
        tty: true,
      }),
    })

    if (!createResponse.ok) {
      const body = (await createResponse.json().catch(() => ({}))) as {
        error?: string
      }
      throw new HttpException(
        `Bridge tunnel create failed (${createResponse.status}): ${body.error ?? createResponse.statusText}`,
        createResponse.status,
      )
    }

    const session = (await createResponse.json()) as BridgeSessionResponse

    this.logger.debug(
      `Bridge raw tunnel created: ${session.id} for container ${containerId}`,
    )

    const ws = new WebSocket(
      `${BRIDGE_WS_URL}/sessions/${session.id}/attach?token=${encodeURIComponent(backendToken)}`,
    )
    ws.binaryType = 'arraybuffer'

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Bridge WebSocket connect timeout (10s)'))
      }, 10000)

      ws.addEventListener(
        'open',
        () => {
          clearTimeout(timeout)
          resolve()
        },
        { once: true },
      )

      ws.addEventListener(
        'error',
        (ev) => {
          clearTimeout(timeout)
          reject(new Error(`Bridge WS connect error: ${JSON.stringify(ev)}`))
        },
        { once: true },
      )
    })

    const dataHandlers: ((data: Buffer) => void)[] = []
    const endHandlers: (() => void)[] = []
    let destroyed = false

    ws.addEventListener('message', (ev) => {
      if (destroyed) {
        return
      }
      const buf =
        ev.data instanceof ArrayBuffer
          ? Buffer.from(ev.data)
          : Buffer.from(ev.data as string)
      for (const handler of dataHandlers) {
        handler(buf)
      }
    })

    ws.addEventListener('close', () => {
      if (destroyed) {
        return
      }
      for (const handler of endHandlers) {
        handler()
      }
    })

    ws.addEventListener('error', (ev) => {
      this.logger.warn(
        `Bridge WS error for session ${session.id}: ${JSON.stringify(ev)}`,
      )
    })

    const stream: DockerTtyStream = {
      write: (data: string | Buffer) => {
        if (destroyed || ws.readyState !== WebSocket.OPEN) {
          return
        }
        ws.send(data)
      },

      onData: (handler: (data: Buffer) => void) => {
        dataHandlers.push(handler)
      },

      onEnd: (handler: () => void) => {
        endHandlers.push(handler)
      },

      resize: async (cols: number, rows: number) => {
        const resizeResponse = await fetch(
          `${BRIDGE_HTTP_URL}/sessions/${session.id}/resize`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${backendToken}`,
            },
            body: JSON.stringify({ cols, rows }),
          },
        )
        if (!resizeResponse.ok) {
          throw new Error(`Bridge resize failed (${resizeResponse.status})`)
        }
      },

      destroy: () => {
        if (destroyed) {
          return
        }
        destroyed = true
        if (ws.readyState === WebSocket.OPEN) {
          ws.close()
        }
        void fetch(`${BRIDGE_HTTP_URL}/sessions/${session.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${backendToken}` },
        }).catch(() => {
          void 0
        })
      },
    }

    return stream
  }

  /** Create a tunnel session and return credentials for direct client access (raw = terminal WS, framed = HTTP tunnel-agent proxying). */
  async createTunnelSession(
    hostId: string,
    containerId: string,
    command: string[],
    label: string,
    mode: 'ephemeral' | 'persistent',
    protocol: 'framed' | 'raw',
    options?: {
      public?: boolean
      appIdentifier: string
    },
  ): Promise<TunnelSessionDetails> {
    const backendToken = this.dockerBridgeService.getSecret()
    const isPublic = options?.public ?? false
    const appIdentifier = options?.appIdentifier

    const createResponse = await fetch(`${BRIDGE_HTTP_URL}/sessions/tunnel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${backendToken}`,
      },
      body: JSON.stringify({
        container_id: containerId,
        command,
        host_id: hostId,
        label,
        mode,
        protocol,
        options: appIdentifier
          ? { app_id: appIdentifier, public: isPublic }
          : undefined,
      }),
    })

    if (!createResponse.ok) {
      const body = (await createResponse.json().catch(() => ({}))) as {
        error?: string
      }
      throw new Error(
        `Bridge tunnel create failed (${createResponse.status}): ${body.error ?? createResponse.statusText}`,
      )
    }

    const session = (await createResponse.json()) as BridgeSessionResponse
    const publicId = (isPublic && session.public_id) || undefined

    this.logger.debug(
      `Bridge tunnel session created: ${session.id} for container ${containerId}${publicId ? ` publicId ${publicId}` : ''}`,
    )

    const token = await this.mintSessionToken(session.id, backendToken, {
      publicId,
      mode,
      protocol,
    })

    const { wsUrl, httpUrl } = this.buildBridgeUrls()

    return {
      sessionId: session.id,
      token,
      ...(appIdentifier && publicId
        ? {
            public: {
              id: publicId,
              url: this.buildTunnelUrl(publicId, label, appIdentifier),
            },
          }
        : {}),
      urls: {
        ws: wsUrl,
        http: httpUrl,
      },
    }
  }

  /** Create (or idempotently reuse) a durable tunnel session under a caller-supplied publicId (always persistent/framed/public); asserts the bridge echoed it back, then mints a token bound to it. */
  async createDurableTunnelSession(
    hostId: string,
    containerId: string,
    command: string[],
    label: string,
    publicId: string,
    appIdentifier: string,
  ): Promise<{
    sessionId: string
    publicId: string
    url: string
    token: string
  }> {
    const backendToken = this.dockerBridgeService.getSecret()

    const createResponse = await fetch(`${BRIDGE_HTTP_URL}/sessions/tunnel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${backendToken}`,
      },
      body: JSON.stringify({
        container_id: containerId,
        command,
        host_id: hostId,
        label,
        mode: 'persistent',
        protocol: 'framed',
        options: {
          app_id: appIdentifier,
          public: true,
          public_id: publicId,
          durable: true,
        },
      }),
    })

    if (!createResponse.ok) {
      const body = (await createResponse.json().catch(() => ({}))) as {
        error?: string
      }
      throw new Error(
        `Bridge durable tunnel create failed (${createResponse.status}): ${body.error ?? createResponse.statusText}`,
      )
    }

    const session = (await createResponse.json()) as BridgeSessionResponse
    if (session.public_id !== publicId) {
      throw new Error(
        `Bridge returned unexpected public_id (wanted ${publicId}, got ${session.public_id ?? 'null'})`,
      )
    }

    const token = await this.mintSessionToken(session.id, backendToken, {
      publicId,
      mode: 'persistent',
      protocol: 'framed',
    })

    return {
      sessionId: session.id,
      publicId,
      url: this.buildTunnelUrl(publicId, label, appIdentifier),
      token,
    }
  }

  /** Mint a fresh traffic token bound to a durable session's stable publicId. */
  mintDurableTunnelToken(sessionId: string, publicId: string): Promise<string> {
    return this.mintSessionToken(
      sessionId,
      this.dockerBridgeService.getSecret(),
      {
        publicId,
        mode: 'persistent',
        protocol: 'framed',
      },
    )
  }

  /** Build the deterministic public tunnel URL for a stable publicId. */
  buildPublicTunnelUrl(
    publicId: string,
    label: string,
    appIdentifier: string,
  ): string {
    return this.buildTunnelUrl(publicId, label, appIdentifier)
  }

  /** Fetch a single bridge session by id (drives the durable health check); null on 404. */
  async getSessionById(sessionId: string): Promise<BridgeSessionFull | null> {
    try {
      return await this.bridgeRequest<BridgeSessionFull>(
        'GET',
        `/sessions/${sessionId}`,
      )
    } catch (error: unknown) {
      if (error instanceof BridgeHttpError && error.statusCode === 404) {
        return null
      }
      throw error
    }
  }

  /** List bridge tunnel sessions (admin observability), optionally filtered; maps snake_case to the camelCase DTO. */
  async listSessions(filter?: {
    appId?: string
    containerId?: string
  }): Promise<DockerSessionDTO[]> {
    const queryParams: Record<string, string> = {}
    if (filter?.appId) {
      queryParams.app_id = filter.appId
    }
    if (filter?.containerId) {
      queryParams.container_id = filter.containerId
    }
    const sessions = await this.bridgeRequest<BridgeSessionFull[]>(
      'GET',
      '/sessions',
      undefined,
      queryParams,
    )
    return sessions.map(toDockerSessionDTO)
  }

  /** List tunnel sessions belonging to an app (session IDs only). */
  async listTunnelSessionsByApp(
    appIdentifier: string,
  ): Promise<{ sessionId: string }[]> {
    const backendToken = this.dockerBridgeService.getSecret()
    const url = `${BRIDGE_HTTP_URL}/sessions?app_id=${encodeURIComponent(appIdentifier)}`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${backendToken}` },
    })
    if (!response.ok) {
      throw new Error(`Bridge session list failed (${response.status})`)
    }
    const sessions = (await response.json()) as { id: string }[]
    return sessions.map((s) => ({ sessionId: s.id }))
  }

  /** Delete a tunnel session, optionally validating ownership by app identifier. */
  async deleteTunnelSession(
    sessionId: string,
    appIdentifier?: string,
  ): Promise<void> {
    const backendToken = this.dockerBridgeService.getSecret()

    if (appIdentifier) {
      const getResponse = await fetch(
        `${BRIDGE_HTTP_URL}/sessions/${sessionId}`,
        {
          headers: { Authorization: `Bearer ${backendToken}` },
        },
      )
      if (!getResponse.ok) {
        if (getResponse.status === 404) {
          return
        } // Already gone
        throw new Error(`Bridge session lookup failed (${getResponse.status})`)
      }
      const session = (await getResponse.json()) as { app_id?: string }
      if (session.app_id && session.app_id !== appIdentifier) {
        throw new Error('Session not owned by this app')
      }
    }

    const response = await fetch(`${BRIDGE_HTTP_URL}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${backendToken}` },
    })
    if (!response.ok && response.status !== 404) {
      throw new Error(`Bridge session delete failed (${response.status})`)
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private mintSessionToken(
    sessionId: string,
    secret: string,
    options?: {
      publicId?: string
      mode?: 'ephemeral' | 'persistent'
      protocol?: 'framed' | 'raw'
    },
  ): Promise<string> {
    // Framed and public sessions get the long TTL (framed auth per-request and must outlive the 30-min idle window); raw/PTY auth once at attach and keep the short TTL.
    const ttlSeconds =
      options?.publicId || options?.protocol === 'framed'
        ? PUBLIC_SESSION_TOKEN_TTL_SECONDS
        : SESSION_TOKEN_TTL_SECONDS
    return new jose.SignJWT({
      sid: sessionId,
      ...(options?.publicId ? { public_id: options.publicId } : {}),
      ...(options?.mode ? { mode: options.mode } : {}),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(`bridge_session:${sessionId}`)
      .setAudience('docker-bridge')
      .setIssuedAt()
      .setExpirationTime(`${ttlSeconds}s`)
      .sign(new TextEncoder().encode(secret))
  }

  private buildBridgeUrls(): { wsUrl: string; httpUrl: string } {
    const { platformHost, platformHttps, platformPort } = this.config
    const wsProtocol = platformHttps ? 'wss' : 'ws'
    const httpProtocol = platformHttps ? 'https' : 'http'
    const portSuffix =
      typeof platformPort === 'number' && ![80, 443].includes(platformPort)
        ? `:${platformPort}`
        : ''
    const host = `${platformHost}${portSuffix}`

    return {
      wsUrl: `${wsProtocol}://${host}/_bridge`,
      httpUrl: `${httpProtocol}://${host}/_bridge`,
    }
  }

  private buildTunnelUrl(
    publicId: string,
    label: string,
    appIdentifier: string,
  ): string {
    const { platformHost, platformHttps, platformPort } = this.config
    const protocol = platformHttps ? 'https' : 'http'
    const portSuffix =
      typeof platformPort === 'number' && ![80, 443].includes(platformPort)
        ? `:${platformPort}`
        : ''
    return `${protocol}://${label}--${publicId}--${appIdentifier}.${platformHost}${portSuffix}`
  }
}

// ---------------------------------------------------------------------------
// Host state types (exported for controller/DTO alignment)
// ---------------------------------------------------------------------------

interface DockerHostContainerStateBase {
  id: string
  image: string
  labels: Record<string, string>
  state: 'running' | 'exited' | 'paused' | 'created' | 'unknown'
  createdAt: string
}

export interface DockerHostWorkerContainerState
  extends DockerHostContainerStateBase {
  containerType: 'worker'
  profileId: string
  profileHash: string
}

export interface DockerHostStandaloneContainerState
  extends DockerHostContainerStateBase {
  containerType: 'standalone'
  standaloneContainerId: string
}

export type DockerHostContainerState =
  | DockerHostWorkerContainerState
  | DockerHostStandaloneContainerState

export interface DockerHostState {
  id: string
  description: string
  connection: ConnectionTestResult
  resources?: DockerHostResources
  containers: DockerHostContainerState[]
  containersError?: string
}
