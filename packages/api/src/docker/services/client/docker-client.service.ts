import { convertUnknownToJsonSerializableObject } from '@lombokapp/types'
import { convertErrorToAsyncWorkError } from '@lombokapp/worker-utils'
import { Inject, Injectable, Logger, Scope } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { ContainerInspectInfo } from 'dockerode'
import { coreConfig } from 'src/core/config'

import { DOCKER_LABELS } from '../docker-jobs.service'
import { DockerAdapterProvider } from './adapters/docker-adapter.provider'
import type { ContainerCreateOptions } from './docker.schema'
import {
  type ConnectionTestResult,
  type ContainerInfo,
  type DockerAdapter,
  type DockerContainerGpuInfo,
  type DockerContainerStats,
  type DockerError,
  type DockerHostResources,
  type DockerLogEntry,
  type DockerPipeStream,
  type DockerStateFunc,
  type DockerTtyStream,
  type FindOrCreateContainerOptions,
} from './docker-client.types'

class DockerClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    cause?: Error,
  ) {
    super(message)
    this.name = 'DockerClientError'
    this.cause = cause
  }
}

@Injectable({ scope: Scope.DEFAULT })
export class DockerClientService {
  private readonly logger = new Logger(DockerClientService.name)

  constructor(
    private readonly dockerAdapterProvider: DockerAdapterProvider,
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
  ) {}

  /**
   * Get a docker adapter by host ID
   */
  private getAdapter(hostId: string): DockerAdapter {
    return this.dockerAdapterProvider.getDockerAdapter(hostId)
  }

  /**
   * Test connectivity to a Docker host
   */
  async testHostConnection(hostId: string): Promise<ConnectionTestResult> {
    return this.getAdapter(hostId).testConnection()
  }

  /**
   * Test connectivity to all Docker host
   */
  async testAllHostConnections(): Promise<
    Record<string, { result: ConnectionTestResult; id: string }>
  > {
    const results: Record<
      string,
      { result: ConnectionTestResult; id: string }
    > = {}
    for (const hostId of Object.keys(
      this._coreConfig.dockerHostConfig.hosts ?? {},
    )) {
      results[hostId] = {
        id: this.getAdapter(hostId).getDescription(),
        result: await this.getAdapter(hostId).testConnection(),
      }
    }
    return results
  }

  /**
   * Get a display-friendly description of a Docker host
   */
  getHostDescription(hostId: string): string {
    return this.getAdapter(hostId).getDescription()
  }

  /**
   * List containers on a host matching the given labels
   */
  async listContainersByLabels(
    hostId: string,
    labels: Record<string, string>,
  ): Promise<ContainerInfo[]> {
    return this.getAdapter(hostId).listContainersByLabels(labels)
  }

  async getContainerLogs(
    hostId: string,
    containerId: string,
    options?: { tail?: number },
  ): Promise<DockerLogEntry[]> {
    return this.getAdapter(hostId).getContainerLogs(containerId, options)
  }

  async getHostResources(hostId: string): Promise<DockerHostResources> {
    return this.getAdapter(hostId).getHostResources()
  }

  async getContainerStats(
    hostId: string,
    containerId: string,
  ): Promise<DockerContainerStats> {
    return this.getAdapter(hostId).getContainerStats(containerId)
  }

  async getContainerInspect(
    hostId: string,
    containerId: string,
  ): Promise<ContainerInspectInfo> {
    return this.getAdapter(hostId).getContainerInspect(containerId)
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
      const execState = await exec.state()
      const { stdout, stderr } = exec.output()
      if (!execState.running && execState.exitCode === 0) {
        const output = stdout.trim() || stderr.trim()
        return {
          driver: driver ?? 'nvidia',
          command: command.join(' '),
          output: output.length ? output : undefined,
        }
      }

      let errorMessage = stderr.trim()
      if (!errorMessage) {
        try {
          const execError = await exec.getError()
          errorMessage = execError.message
        } catch (error) {
          errorMessage = error instanceof Error ? error.message : String(error)
        }
      }

      return {
        driver: driver ?? 'nvidia',
        command: command.join(' '),
        output: stdout.trim() || undefined,
        error: errorMessage || 'Failed to run nvidia-smi.',
      }
    } catch (error) {
      return {
        driver: driver ?? 'nvidia',
        command: command.join(' '),
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async startContainer(hostId: string, containerId: string): Promise<void> {
    await this.getAdapter(hostId).startContainer(containerId)
  }

  async stopContainer(hostId: string, containerId: string): Promise<void> {
    await this.getAdapter(hostId).stopContainer(containerId)
  }

  async restartContainer(hostId: string, containerId: string): Promise<void> {
    await this.getAdapter(hostId).restartContainer(containerId)
  }

  async removeContainer(
    hostId: string,
    containerId: string,
    options?: { force?: boolean },
  ): Promise<void> {
    await this.getAdapter(hostId).removeContainer(containerId, options)
  }

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

  /**
   * Find an existing running container or create a new one
   * based on the given profile and labels
   */
  private async ensureContainerRunning(
    hostId: string,
    container: ContainerInfo,
  ): Promise<ContainerInfo> {
    if (container.state === 'running') {
      return container
    }

    await this.withErrorGuard(
      async () => this.getAdapter(hostId).startContainer(container.id),
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
    options?: { startIfNotRunning?: boolean },
  ): Promise<ContainerInfo | undefined> {
    // TODO: Should this detect running container with non-matching host config (volumes, gpus, etc.)?
    const adapter = this.getAdapter(hostId)

    // Look for a particular container by ID
    const container = await this.withErrorGuard(
      async () => adapter.getContainerInspect(containerId),
      (error) =>
        convertErrorToAsyncWorkError(
          error instanceof Error ? error : new Error(String(error)),
          {
            name: 'DockerClientError',
            message: `Failed to find container by id "${containerId}": ${error instanceof Error ? error.message : String(error)}`,
            code: 'FIND_CONTAINER_BY_ID_FAILED',
            stack: new Error().stack,
            details: { containerId },
          },
        ),
    ).then((containerInspect) => {
      const state: ContainerInfo['state'] = containerInspect.State.Running
        ? 'running'
        : containerInspect.State.Paused
          ? 'paused'
          : containerInspect.State.Status === 'exited'
            ? 'exited'
            : containerInspect.State.Status === 'created'
              ? 'created'
              : 'unknown'
      return {
        id: containerInspect.Id,
        image: containerInspect.Config.Image,
        labels: containerInspect.Config.Labels,
        state,
        reusable: !containerInspect.State.Dead,
        createdAt: containerInspect.Created,
      }
    })

    if (options?.startIfNotRunning) {
      return this.ensureContainerRunning(hostId, container)
    }

    return container
  }

  /**
   * Find an existing running container or create a new one
   * based on the given profile and labels
   */
  async findOrCreateContainer(
    hostId: string,
    options: FindOrCreateContainerOptions,
  ): Promise<ContainerInfo | undefined> {
    // TODO: Should this detect running container with non-matching host config (volumes, gpus, etc.)?
    const adapter = this.getAdapter(hostId)

    // Look for existing containers with matching labels
    const existingContainers = await this.withErrorGuard(
      async () => adapter.listContainersByLabels(options.labels),
      (error) => {
        return convertErrorToAsyncWorkError(
          error instanceof Error ? error : new Error(String(error)),
          {
            name: 'DockerClientError',
            origin: 'internal',
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

    // Filter containers by userId label: if no userId was requested,
    // exclude containers that have one; if one was requested, Docker's label
    // filter already ensures an exact match.
    const requestedUserId = options.labels[DOCKER_LABELS.USER_ID]
    const matchingContainers = requestedUserId
      ? existingContainers
      : existingContainers.filter(
          (container) => !container.labels[DOCKER_LABELS.USER_ID],
        )

    // Find a running container
    const runningContainer = matchingContainers.find(
      (container) => container.state === 'running',
    )

    if (runningContainer) {
      return runningContainer
    }

    // Find a stopped container we can restart
    const stoppedContainer = matchingContainers.find(
      (container) =>
        container.state === 'exited' || container.state === 'created',
    )

    if (stoppedContainer) {
      if (options.startIfNotRunning) {
        return this.ensureContainerRunning(hostId, stoppedContainer)
      }
      return stoppedContainer
    }

    // No suitable container found, create a new one with labels as env vars
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
      async () => adapter.createContainer(createOptions),
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

  async execInContainer(
    hostId: string,
    containerId: string,
    command: string[],
    options?: {
      env?: Record<string, string>
    },
  ): Promise<{
    getError: () => Promise<DockerError>
    state: DockerStateFunc
    output: () => { stdout: string; stderr: string }
  }> {
    return this.getAdapter(hostId).execInContainer(containerId, command, {
      ...options,
      env: options?.env ?? {},
    })
  }

  async execTty(
    hostId: string,
    containerId: string,
    command: string[],
    options?: {
      cols?: number
      rows?: number
      env?: Record<string, string>
    },
  ): Promise<DockerTtyStream> {
    return this.getAdapter(hostId).execTty(containerId, command, {
      ...options,
      env: options?.env ?? {},
    })
  }

  async execPipe(
    hostId: string,
    containerId: string,
    command: string[],
    options?: {
      env?: Record<string, string>
    },
  ): Promise<DockerPipeStream> {
    return this.getAdapter(hostId).execPipe(containerId, command, {
      ...options,
      env: {
        ...(options?.env ?? {}),
        LOMBOK_CONTAINER_ID: containerId,
        LOMBOK_CONTAINER_HOST_ID: hostId,
      },
    })
  }

  resolveDockerHostConfigForProfile(profileKey: string): {
    hostId: string
    volumes: string[] | undefined
    env: Record<string, string> | undefined
    gpus: { driver: string; deviceIds: string[] } | undefined
    extraHosts: string[] | undefined
    networkMode: 'host' | 'bridge' | `container:${string}` | undefined
  } {
    const profileKeyParts = profileKey.split(':')
    const appSlugProfileKey = `${profileKeyParts[0]?.split('_')[0]}:${profileKeyParts[1]}`

    const resolvedHostId =
      this._coreConfig.dockerHostConfig.profileHostAssignments?.[profileKey] ??
      this._coreConfig.dockerHostConfig.profileHostAssignments?.[
        appSlugProfileKey
      ] ??
      'local'

    return {
      hostId: resolvedHostId,
      env:
        this._coreConfig.dockerHostConfig.hosts?.[resolvedHostId]?.env?.[
          profileKey
        ] ??
        this._coreConfig.dockerHostConfig.hosts?.[resolvedHostId]?.env?.[
          appSlugProfileKey
        ],
      volumes:
        this._coreConfig.dockerHostConfig.hosts?.[resolvedHostId]?.volumes?.[
          profileKey
        ] ??
        this._coreConfig.dockerHostConfig.hosts?.[resolvedHostId]?.volumes?.[
          appSlugProfileKey
        ],
      gpus:
        this._coreConfig.dockerHostConfig.hosts?.[resolvedHostId]?.gpus?.[
          profileKey
        ] ??
        this._coreConfig.dockerHostConfig.hosts?.[resolvedHostId]?.gpus?.[
          appSlugProfileKey
        ],
      extraHosts:
        this._coreConfig.dockerHostConfig.hosts?.[resolvedHostId]?.extraHosts?.[
          profileKey
        ] ??
        this._coreConfig.dockerHostConfig.hosts?.[resolvedHostId]?.extraHosts?.[
          appSlugProfileKey
        ],
      networkMode: (this._coreConfig.dockerHostConfig.hosts?.[resolvedHostId]
        ?.networkMode?.[profileKey] ??
        this._coreConfig.dockerHostConfig.hosts?.[resolvedHostId]
          ?.networkMode?.[appSlugProfileKey]) as
        | 'host'
        | 'bridge'
        | `container:${string}`
        | undefined,
    }
  }

  /**
   * Resolve (find or create) a profile container and ensure it is running.
   * Does NOT execute any command — use `execInContainer` separately.
   */
  async resolveContainer(
    attributes: { profileKey: string } | { containerRef: string },
    { image, labels, env: extraEnv }: ContainerCreateOptions,
  ): Promise<{ containerId: string; hostId: string }> {
    if ('containerRef' in attributes) {
      // Short-circuit: container already exists, just resolve and start if needed
      const [refHostId, refContainerId] = attributes.containerRef.split(':')
      const hostId = refHostId ?? ''

      if (!(hostId in (this._coreConfig.dockerHostConfig.hosts ?? {}))) {
        throw new DockerClientError(
          'DOCKER_NOT_CONFIGURED',
          `Unrecognized Docker host "${hostId}" in containerRef "${attributes.containerRef}"`,
        )
      }

      if (!refContainerId) {
        throw new DockerClientError(
          'INVALID_CONTAINER_REF',
          `Invalid containerRef "${attributes.containerRef}" — expected format "hostId:containerId"`,
        )
      }

      const container = await this.findContainerById(hostId, refContainerId, {
        startIfNotRunning: true,
      })
      if (!container) {
        throw new DockerClientError(
          'CONTAINER_NOT_FOUND',
          `Container "${refContainerId}" not found on host "${hostId}"`,
        )
      }
      return { hostId, containerId: container.id }
    }

    // Profile path: resolve host config, find or create container
    const { hostId, ...config } = this.resolveDockerHostConfigForProfile(
      attributes.profileKey,
    )

    if (!(hostId in (this._coreConfig.dockerHostConfig.hosts ?? {}))) {
      throw new DockerClientError(
        'DOCKER_NOT_CONFIGURED',
        `Unrecognized Docker host "${hostId}" configured for profile "${attributes.profileKey}"`,
      )
    }

    const container = await this.findOrCreateContainer(hostId, {
      image,
      labels,
      startIfNotRunning: true,
      ...config,
      env: { ...config.env, ...extraEnv },
    })

    if (!container) {
      throw new DockerClientError(
        'CONTAINER_NOT_FOUND',
        'Container not found after findOrCreateContainer call',
      )
    }
    return { hostId, containerId: container.id }
  }

  /**
   * Find or create a container and execute a command.
   *
   * When `profileKey` is provided, resolves host config from the profile
   * and finds or creates a matching container.
   *
   * When `containerRef` is provided (format: "hostId:containerId"),
   * the container is resolved directly and started if not already running.
   */
  async execInResolvedContainer(
    attributes: { profileKey: string } | { containerRef: string },
    options: ContainerCreateOptions,
    buildCommand: (containerMetadata: {
      containerId: string
      hostId: string
    }) => string[],
  ): Promise<{
    containerId: string
    hostId: string
    getError: () => Promise<DockerError>
    state: DockerStateFunc
    output: () => { stdout: string; stderr: string }
  }> {
    const { hostId, containerId } = await this.resolveContainer(
      attributes,
      options,
    )

    const adapter = this.getAdapter(hostId)
    const command = buildCommand({ containerId, hostId })

    this.logger.debug('execInContainer:', {
      hostId,
      containerId,
      command,
      labels: options.labels,
    })

    const { getError, state, output } = await this.withErrorGuard(
      async () => adapter.execInContainer(containerId, command, {}),
      (error) =>
        convertErrorToAsyncWorkError(
          error instanceof Error ? error : new Error(String(error)),
          {
            name: 'DockerClientError',
            origin: 'internal',
            message: `Failed to execute command in container: ${error instanceof Error ? error.message : String(error)}`,
            code: 'EXEC_IN_CONTAINER_FAILED',
            stack: new Error().stack,
            details: { containerId },
          },
        ),
    )

    return {
      getError,
      hostId,
      containerId,
      state,
      output,
    }
  }
}
