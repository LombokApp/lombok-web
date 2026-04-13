import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import * as crypto from 'crypto'
import { and, eq } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'
import { v4 as uuidV4 } from 'uuid'

import {
  type DockerHost,
  dockerHostsTable,
} from '../entities/docker-host.entity'
import {
  type DockerProfileResourceAssignment,
  dockerProfileResourceAssignmentsTable,
} from '../entities/docker-profile-resource-assignment.entity'
import {
  type DockerRegistryCredential,
  dockerRegistryCredentialsTable,
} from '../entities/docker-registry-credential.entity'
import {
  type DockerResourceConfig,
  type DockerResourceConfigRow,
  dockerResourceConfigsTable,
} from '../entities/docker-resource-config.entity'
import {
  type DockerStandaloneContainer,
  dockerStandaloneContainersTable,
} from '../entities/docker-standalone-container.entity'
import { DockerBridgeService } from './docker-bridge.service'

// ─── Helpers ───────────────────────────────────────────────────────────────

function computeConfigHashes(
  config: DockerResourceConfig,
): Record<string, string> {
  const hashes: Record<string, string> = {}
  for (const [key, value] of Object.entries(config)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (value !== undefined && value !== null) {
      hashes[key] = crypto
        .createHash('sha256')
        .update(JSON.stringify(value))
        .digest('hex')
        .slice(0, 12)
    }
  }
  return hashes
}

// ─── Service ───────────────────────────────────────────────────────────────

@Injectable()
export class DockerHostManagementService {
  private readonly logger = new Logger(DockerHostManagementService.name)

  dockerBridgeService: DockerBridgeService

  constructor(
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => DockerBridgeService))
    _dockerBridgeService,
  ) {
    this.dockerBridgeService = _dockerBridgeService as DockerBridgeService
  }

  // ─── Docker Hosts ──────────────────────────────────────────────────────

  async listHosts(): Promise<DockerHost[]> {
    return this.ormService.db.query.dockerHostsTable.findMany({
      orderBy: (hosts, { asc }) => [asc(hosts.label)],
    })
  }

  async getHost(id: string): Promise<DockerHost | undefined> {
    return this.ormService.db.query.dockerHostsTable.findFirst({
      where: eq(dockerHostsTable.id, id),
    })
  }

  async getHostOrThrow(id: string): Promise<DockerHost> {
    const host = await this.getHost(id)
    if (!host) {
      throw new NotFoundException(`Docker host not found: ${id}`)
    }
    return host
  }

  async createHost(input: {
    label: string
    type: 'docker_endpoint'
    host: string
    tlsConfig?: { ca?: string; cert?: string; key?: string }
    isDefault?: boolean
    enabled?: boolean
  }): Promise<DockerHost> {
    const now = new Date()
    const id = uuidV4()

    if (input.isDefault) {
      await this.clearDefaultHost()
    }

    const [host] = await this.ormService.db
      .insert(dockerHostsTable)
      .values({
        id,
        label: input.label,
        type: input.type,
        host: input.host,
        tlsConfig: input.tlsConfig ?? null,
        isDefault: input.isDefault ?? false,
        enabled: input.enabled ?? true,
        healthStatus: 'unknown',
        lastHealthCheck: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!host) {
      throw new InternalServerErrorException('Failed to create docker host')
    }

    void this.dockerBridgeService.syncHosts()
    return host
  }

  async updateHost(
    id: string,
    input: Partial<{
      label: string
      type: 'docker_endpoint'
      host: string
      tlsConfig: { ca?: string; cert?: string; key?: string }
      isDefault: boolean
      enabled: boolean
    }>,
  ): Promise<DockerHost> {
    await this.getHostOrThrow(id)

    if (input.isDefault) {
      await this.clearDefaultHost()
    }

    const [updated] = await this.ormService.db
      .update(dockerHostsTable)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(dockerHostsTable.id, id))
      .returning()

    if (!updated) {
      throw new InternalServerErrorException('Failed to update docker host')
    }
    void this.dockerBridgeService.syncHosts()
    return updated
  }

  async deleteHost(id: string): Promise<void> {
    const configs =
      await this.ormService.db.query.dockerResourceConfigsTable.findMany({
        where: eq(dockerResourceConfigsTable.dockerHostId, id),
      })
    if (configs.length > 0) {
      throw new BadRequestException(
        `Cannot delete host: ${configs.length} resource config(s) still reference it. Delete or reassign them first.`,
      )
    }

    const result = await this.ormService.db
      .delete(dockerHostsTable)
      .where(eq(dockerHostsTable.id, id))
      .returning()

    if (result.length === 0) {
      throw new NotFoundException(`Docker host not found: ${id}`)
    }
    void this.dockerBridgeService.syncHosts()
  }

  async updateHostHealth(
    id: string,
    status: 'healthy' | 'unhealthy' | 'unknown',
  ): Promise<void> {
    await this.ormService.db
      .update(dockerHostsTable)
      .set({
        healthStatus: status,
        lastHealthCheck: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(dockerHostsTable.id, id))
  }

  private async clearDefaultHost(): Promise<void> {
    await this.ormService.db
      .update(dockerHostsTable)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(dockerHostsTable.isDefault, true))
  }

  // ─── Registry Credentials ─────────────────────────────────────────────

  async listRegistryCredentials(): Promise<DockerRegistryCredential[]> {
    return this.ormService.db.query.dockerRegistryCredentialsTable.findMany({
      orderBy: (creds, { asc }) => [asc(creds.registry)],
    })
  }

  async getRegistryCredential(
    id: string,
  ): Promise<DockerRegistryCredential | undefined> {
    return this.ormService.db.query.dockerRegistryCredentialsTable.findFirst({
      where: eq(dockerRegistryCredentialsTable.id, id),
    })
  }

  async createRegistryCredential(input: {
    registry: string
    serverAddress: string
    username: string
    password: string
  }): Promise<DockerRegistryCredential> {
    const now = new Date()
    const [cred] = await this.ormService.db
      .insert(dockerRegistryCredentialsTable)
      .values({
        id: uuidV4(),
        ...input,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!cred) {
      throw new InternalServerErrorException(
        'Failed to create registry credential',
      )
    }
    return cred
  }

  async updateRegistryCredential(
    id: string,
    input: Partial<{
      registry: string
      serverAddress: string
      username: string
      password: string
    }>,
  ): Promise<DockerRegistryCredential> {
    const [updated] = await this.ormService.db
      .update(dockerRegistryCredentialsTable)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(dockerRegistryCredentialsTable.id, id))
      .returning()

    if (!updated) {
      throw new NotFoundException(`Registry credential not found: ${id}`)
    }
    return updated
  }

  async deleteRegistryCredential(id: string): Promise<void> {
    const result = await this.ormService.db
      .delete(dockerRegistryCredentialsTable)
      .where(eq(dockerRegistryCredentialsTable.id, id))
      .returning()

    if (result.length === 0) {
      throw new NotFoundException(`Registry credential not found: ${id}`)
    }
  }

  // ─── Resource Configs ─────────────────────────────────────────────────

  async listResourceConfigs(
    dockerHostId?: string,
  ): Promise<DockerResourceConfigRow[]> {
    if (dockerHostId) {
      return this.ormService.db.query.dockerResourceConfigsTable.findMany({
        where: eq(dockerResourceConfigsTable.dockerHostId, dockerHostId),
        orderBy: (configs, { asc }) => [asc(configs.label)],
      })
    }
    return this.ormService.db.query.dockerResourceConfigsTable.findMany({
      orderBy: (configs, { asc }) => [asc(configs.label)],
    })
  }

  async getResourceConfig(
    id: string,
  ): Promise<DockerResourceConfigRow | undefined> {
    return this.ormService.db.query.dockerResourceConfigsTable.findFirst({
      where: eq(dockerResourceConfigsTable.id, id),
    })
  }

  async getResourceConfigOrThrow(id: string): Promise<DockerResourceConfigRow> {
    const config = await this.getResourceConfig(id)
    if (!config) {
      throw new NotFoundException(`Resource config not found: ${id}`)
    }
    return config
  }

  async createResourceConfig(input: {
    dockerHostId: string
    label: string
    config: DockerResourceConfig
  }): Promise<DockerResourceConfigRow> {
    await this.getHostOrThrow(input.dockerHostId)

    const now = new Date()
    const configHashes = computeConfigHashes(input.config)

    const [created] = await this.ormService.db
      .insert(dockerResourceConfigsTable)
      .values({
        id: uuidV4(),
        dockerHostId: input.dockerHostId,
        label: input.label,
        config: input.config,
        configHashes,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!created) {
      throw new InternalServerErrorException('Failed to create resource config')
    }
    return created
  }

  async updateResourceConfig(
    id: string,
    input: Partial<{
      label: string
      config: DockerResourceConfig
    }>,
  ): Promise<DockerResourceConfigRow> {
    const _existing = await this.getResourceConfigOrThrow(id)

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (input.label !== undefined) {
      updates.label = input.label
    }
    if (input.config !== undefined) {
      updates.config = input.config
      updates.configHashes = computeConfigHashes(input.config)
    }

    const [updated] = await this.ormService.db
      .update(dockerResourceConfigsTable)
      .set(updates)
      .where(eq(dockerResourceConfigsTable.id, id))
      .returning()

    if (!updated) {
      throw new InternalServerErrorException('Failed to update resource config')
    }
    return updated
  }

  async cloneResourceConfig(
    id: string,
    newLabel?: string,
  ): Promise<DockerResourceConfigRow> {
    const source = await this.getResourceConfigOrThrow(id)

    const now = new Date()
    const [cloned] = await this.ormService.db
      .insert(dockerResourceConfigsTable)
      .values({
        id: uuidV4(),
        dockerHostId: source.dockerHostId,
        label: newLabel ?? `${source.label} (copy)`,
        config: source.config,
        configHashes: source.configHashes,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!cloned) {
      throw new InternalServerErrorException('Failed to clone resource config')
    }
    return cloned
  }

  async findSimilarConfigValues(
    id: string,
  ): Promise<Record<string, { configId: string; label: string }[]>> {
    const source = await this.getResourceConfigOrThrow(id)
    const allConfigs =
      await this.ormService.db.query.dockerResourceConfigsTable.findMany({
        where: eq(dockerResourceConfigsTable.dockerHostId, source.dockerHostId),
      })

    const similar: Record<string, { configId: string; label: string }[]> = {}

    for (const [key, hash] of Object.entries(source.configHashes)) {
      const matches = allConfigs.filter(
        (c) => c.id !== id && c.configHashes[key] === hash,
      )
      if (matches.length > 0) {
        similar[key] = matches.map((c) => ({ configId: c.id, label: c.label }))
      }
    }

    return similar
  }

  async deleteResourceConfig(id: string): Promise<void> {
    const assignments =
      await this.ormService.db.query.dockerProfileResourceAssignmentsTable.findMany(
        {
          where: eq(
            dockerProfileResourceAssignmentsTable.dockerResourceConfigId,
            id,
          ),
        },
      )
    const containers =
      await this.ormService.db.query.dockerStandaloneContainersTable.findMany({
        where: eq(dockerStandaloneContainersTable.dockerResourceConfigId, id),
      })

    if (assignments.length > 0 || containers.length > 0) {
      throw new BadRequestException(
        `Cannot delete resource config: still referenced by ${assignments.length} profile assignment(s) and ${containers.length} standalone container(s).`,
      )
    }

    const result = await this.ormService.db
      .delete(dockerResourceConfigsTable)
      .where(eq(dockerResourceConfigsTable.id, id))
      .returning()

    if (result.length === 0) {
      throw new NotFoundException(`Resource config not found: ${id}`)
    }
  }

  // ─── Profile Resource Assignments ─────────────────────────────────────

  async listProfileAssignments(
    appIdentifier?: string,
  ): Promise<DockerProfileResourceAssignment[]> {
    if (appIdentifier) {
      return this.ormService.db.query.dockerProfileResourceAssignmentsTable.findMany(
        {
          where: eq(
            dockerProfileResourceAssignmentsTable.appIdentifier,
            appIdentifier,
          ),
          orderBy: (a, { asc }) => [asc(a.profileKey)],
        },
      )
    }
    return this.ormService.db.query.dockerProfileResourceAssignmentsTable.findMany(
      {
        orderBy: (a, { asc }) => [asc(a.appIdentifier), asc(a.profileKey)],
      },
    )
  }

  async getProfileAssignment(
    id: string,
  ): Promise<DockerProfileResourceAssignment | undefined> {
    return this.ormService.db.query.dockerProfileResourceAssignmentsTable.findFirst(
      { where: eq(dockerProfileResourceAssignmentsTable.id, id) },
    )
  }

  async createProfileAssignment(input: {
    dockerResourceConfigId: string
    appIdentifier: string
    profileKey: string
  }): Promise<DockerProfileResourceAssignment> {
    await this.getResourceConfigOrThrow(input.dockerResourceConfigId)

    const now = new Date()
    const [created] = await this.ormService.db
      .insert(dockerProfileResourceAssignmentsTable)
      .values({
        id: uuidV4(),
        ...input,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!created) {
      throw new InternalServerErrorException(
        'Failed to create profile assignment',
      )
    }
    return created
  }

  async updateProfileAssignment(
    id: string,
    input: { dockerResourceConfigId: string },
  ): Promise<DockerProfileResourceAssignment> {
    await this.getResourceConfigOrThrow(input.dockerResourceConfigId)

    const [updated] = await this.ormService.db
      .update(dockerProfileResourceAssignmentsTable)
      .set({
        dockerResourceConfigId: input.dockerResourceConfigId,
        updatedAt: new Date(),
      })
      .where(eq(dockerProfileResourceAssignmentsTable.id, id))
      .returning()

    if (!updated) {
      throw new NotFoundException(`Profile assignment not found: ${id}`)
    }
    return updated
  }

  async deleteProfileAssignment(id: string): Promise<void> {
    const result = await this.ormService.db
      .delete(dockerProfileResourceAssignmentsTable)
      .where(eq(dockerProfileResourceAssignmentsTable.id, id))
      .returning()

    if (result.length === 0) {
      throw new NotFoundException(`Profile assignment not found: ${id}`)
    }
  }

  // ─── Standalone Containers ────────────────────────────────────────────

  async listStandaloneContainers(): Promise<DockerStandaloneContainer[]> {
    return this.ormService.db.query.dockerStandaloneContainersTable.findMany({
      orderBy: (c, { asc }) => [asc(c.label)],
    })
  }

  async getStandaloneContainer(
    id: string,
  ): Promise<DockerStandaloneContainer | undefined> {
    return this.ormService.db.query.dockerStandaloneContainersTable.findFirst({
      where: eq(dockerStandaloneContainersTable.id, id),
    })
  }

  async createStandaloneContainer(input: {
    dockerResourceConfigId: string
    label: string
    image: string
    tag?: string
    desiredStatus?: 'running' | 'stopped'
    ports?: { host: number; container: number; protocol: 'tcp' | 'udp' }[]
  }): Promise<DockerStandaloneContainer> {
    await this.getResourceConfigOrThrow(input.dockerResourceConfigId)

    const now = new Date()
    const [created] = await this.ormService.db
      .insert(dockerStandaloneContainersTable)
      .values({
        id: uuidV4(),
        dockerResourceConfigId: input.dockerResourceConfigId,
        label: input.label,
        image: input.image,
        tag: input.tag ?? 'latest',
        desiredStatus: input.desiredStatus ?? 'stopped',
        ports: input.ports ?? [],
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!created) {
      throw new InternalServerErrorException(
        'Failed to create standalone container',
      )
    }
    return created
  }

  async updateStandaloneContainer(
    id: string,
    input: Partial<{
      dockerResourceConfigId: string
      label: string
      image: string
      tag: string
      desiredStatus: 'running' | 'stopped'
      ports: { host: number; container: number; protocol: 'tcp' | 'udp' }[]
    }>,
  ): Promise<DockerStandaloneContainer> {
    if (input.dockerResourceConfigId) {
      await this.getResourceConfigOrThrow(input.dockerResourceConfigId)
    }

    const [updated] = await this.ormService.db
      .update(dockerStandaloneContainersTable)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(dockerStandaloneContainersTable.id, id))
      .returning()

    if (!updated) {
      throw new NotFoundException(`Standalone container not found: ${id}`)
    }
    return updated
  }

  async deleteStandaloneContainer(id: string): Promise<void> {
    const result = await this.ormService.db
      .delete(dockerStandaloneContainersTable)
      .where(eq(dockerStandaloneContainersTable.id, id))
      .returning()

    if (result.length === 0) {
      throw new NotFoundException(`Standalone container not found: ${id}`)
    }
  }

  // ─── Resolution (replaces resolveDockerHostConfigForProfile) ──────────

  /**
   * Resolve the Docker host and resource config for a given app profile.
   *
   * Resolution order:
   * 1. Exact match: assignment for (appIdentifier, profileKey)
   * 2. App default: assignment for (appIdentifier, '_default')
   * 3. Global default: the docker host with is_default=true, no resource config
   */
  async resolveProfileConfig(
    appIdentifier: string,
    profileKey: string,
  ): Promise<{
    hostId: string
    host: DockerHost
    resourceConfig: DockerResourceConfig | null
  }> {
    // 1. Exact match
    const exact =
      await this.ormService.db.query.dockerProfileResourceAssignmentsTable.findFirst(
        {
          where: and(
            eq(
              dockerProfileResourceAssignmentsTable.appIdentifier,
              appIdentifier,
            ),
            eq(dockerProfileResourceAssignmentsTable.profileKey, profileKey),
          ),
        },
      )

    if (exact) {
      const config = await this.getResourceConfigOrThrow(
        exact.dockerResourceConfigId,
      )
      const host = await this.getHostOrThrow(config.dockerHostId)
      return {
        hostId: host.id,
        host,
        resourceConfig: config.config,
      }
    }

    // 2. App-level default
    const appDefault =
      await this.ormService.db.query.dockerProfileResourceAssignmentsTable.findFirst(
        {
          where: and(
            eq(
              dockerProfileResourceAssignmentsTable.appIdentifier,
              appIdentifier,
            ),
            eq(dockerProfileResourceAssignmentsTable.profileKey, '_default'),
          ),
        },
      )

    if (appDefault) {
      const config = await this.getResourceConfigOrThrow(
        appDefault.dockerResourceConfigId,
      )
      const host = await this.getHostOrThrow(config.dockerHostId)
      return {
        hostId: host.id,
        host,
        resourceConfig: config.config,
      }
    }

    // 3. Global default host
    const defaultHost =
      await this.ormService.db.query.dockerHostsTable.findFirst({
        where: eq(dockerHostsTable.isDefault, true),
      })

    if (!defaultHost) {
      throw new NotFoundException(
        `No docker host configured for profile ${appIdentifier}:${profileKey} and no default host set.`,
      )
    }

    return {
      hostId: defaultHost.id,
      host: defaultHost,
      resourceConfig: null,
    }
  }

  /**
   * Build the full registry auth map for passing to the docker bridge.
   */
  async getRegistryAuthMap(): Promise<
    Record<
      string,
      { username: string; password: string; serverAddress: string }
    >
  > {
    const creds = await this.listRegistryCredentials()
    return Object.fromEntries(
      creds.map((c) => [
        c.registry,
        {
          username: c.username,
          password: c.password,
          serverAddress: c.serverAddress,
        },
      ]),
    )
  }
}
