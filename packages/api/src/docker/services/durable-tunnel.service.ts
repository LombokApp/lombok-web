import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import crypto from 'crypto'
import { and, eq } from 'drizzle-orm'

import { OrmService } from '../../orm/orm.service'
import {
  type DockerBridgeTunnel,
  dockerBridgeTunnelsTable,
} from '../entities/docker-bridge-tunnel.entity'
import { DockerClientService } from './client/docker-client.service'
import type { ContainerInfo } from './client/docker-client.types'
import { DOCKER_LABELS } from './docker-jobs.service'

/** App-facing lifecycle state derived from the row status. */
export type DurableTunnelState = 'live' | 'container_not_running' | 'error'

/** App-facing durable tunnel view — token is null unless freshly bound. */
export interface DurableTunnelView {
  id: string
  port: number
  label: string
  publicId: string
  url: string
  token: string | null
  state: DurableTunnelState
  createdAt: Date
  updatedAt: Date
}

interface CreateDurableTunnelInput {
  appId: string
  userId: string
  hostId: string
  containerId: string
  selectorKey: string
  port: number
  label: string
  command: string[]
}

interface OwnerScope {
  appId: string
  userId: string
}

/** Identifying labels we snapshot into container_selector for re-resolution. */
const SELECTOR_LABELS = [
  DOCKER_LABELS.APP_ID,
  DOCKER_LABELS.USER_ID,
  DOCKER_LABELS.ISOLATION_KEY,
  DOCKER_LABELS.PROFILE_ID,
] as const

@Injectable()
export class DurableTunnelService {
  private readonly logger = new Logger(DurableTunnelService.name)

  // Coalesce concurrent ensureLive per tunnel id so racing callers share one rebind.
  private readonly inFlight = new Map<string, Promise<DurableTunnelView>>()

  constructor(
    private readonly ormService: OrmService,
    private readonly dockerClientService: DockerClientService,
  ) {}

  /** Create (or idempotently reuse) a durable tunnel for the unique (app, user, selectorKey, port) tuple, then bind it live. */
  async create(input: CreateDurableTunnelInput): Promise<DurableTunnelView> {
    const container = await this.dockerClientService.findContainerById(
      input.hostId,
      input.containerId,
    )
    if (!container) {
      throw new NotFoundException(
        `No container found for "${input.containerId}"`,
      )
    }
    if (container.state !== 'running') {
      throw new NotFoundException(
        `Container "${input.containerId}" is not running (state: ${container.state})`,
      )
    }
    if (container.labels[DOCKER_LABELS.APP_ID] !== input.appId) {
      throw new ForbiddenException('Container not owned by this app')
    }
    if (container.labels[DOCKER_LABELS.USER_ID] !== input.userId) {
      throw new ForbiddenException('Container not owned by this user')
    }

    const containerSelector = this.snapshotSelector(container)

    const existing =
      await this.ormService.db.query.dockerBridgeTunnelsTable.findFirst({
        where: and(
          eq(dockerBridgeTunnelsTable.appId, input.appId),
          eq(dockerBridgeTunnelsTable.userId, input.userId),
          eq(dockerBridgeTunnelsTable.selectorKey, input.selectorKey),
          eq(dockerBridgeTunnelsTable.port, input.port),
        ),
      })

    const now = new Date()
    let row: DockerBridgeTunnel | undefined
    if (existing) {
      // Reuse the stable publicId; refresh the mutable fields.
      ;[row] = await this.ormService.db
        .update(dockerBridgeTunnelsTable)
        .set({
          hostId: input.hostId,
          containerSelector,
          label: input.label,
          command: input.command,
          updatedAt: now,
        })
        .where(eq(dockerBridgeTunnelsTable.id, existing.id))
        .returning()
    } else {
      const publicId = await this.generateUniquePublicId()
      ;[row] = await this.ormService.db
        .insert(dockerBridgeTunnelsTable)
        .values({
          id: crypto.randomUUID(),
          appId: input.appId,
          userId: input.userId,
          hostId: input.hostId,
          selectorKey: input.selectorKey,
          containerSelector,
          port: input.port,
          label: input.label,
          publicId,
          command: input.command,
          sessionId: null,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        })
        .returning()
    }

    if (!row) {
      throw new Error('Failed to persist durable tunnel row')
    }
    return this.ensureLive(row.id)
  }

  /** Self-heal: re-resolve the container by labels, reuse or recreate the bridge session under the stable publicId, mint a fresh token. Never starts a container. */
  async ensureLive(tunnelId: string): Promise<DurableTunnelView> {
    const pending = this.inFlight.get(tunnelId)
    if (pending) {
      return pending
    }
    const promise = this.runEnsureLive(tunnelId).finally(() => {
      this.inFlight.delete(tunnelId)
    })
    this.inFlight.set(tunnelId, promise)
    return promise
  }

  private async runEnsureLive(tunnelId: string): Promise<DurableTunnelView> {
    const row =
      await this.ormService.db.query.dockerBridgeTunnelsTable.findFirst({
        where: eq(dockerBridgeTunnelsTable.id, tunnelId),
      })
    if (!row) {
      throw new NotFoundException(`Durable tunnel not found: ${tunnelId}`)
    }

    try {
      const container = await this.resolveRunningContainer(row)
      if (!container) {
        const updated = await this.patch(row.id, {
          status: 'unavailable',
          sessionId: null,
          lastError: null,
        })
        return this.toView(updated, null)
      }

      // Reuse a healthy session bound to the live container, if any.
      if (row.sessionId) {
        const session = await this.dockerClientService.getSessionById(
          row.sessionId,
        )
        if (
          session &&
          session.agent_ready &&
          session.public_id === row.publicId &&
          session.container_id === container.id
        ) {
          const token = await this.dockerClientService.mintDurableTunnelToken(
            row.sessionId,
            row.publicId,
          )
          const updated = await this.patch(row.id, {
            status: 'live',
            lastError: null,
            lastBoundAt: new Date(),
          })
          return this.toView(updated, token)
        }
        // Stale session (gone, wrong container, or not ready): drop and rebind.
        if (session) {
          await this.dockerClientService
            .deleteTunnelSession(row.sessionId, row.appId)
            .catch(() => undefined)
        }
      }

      const created = await this.dockerClientService.createDurableTunnelSession(
        row.hostId,
        container.id,
        row.command,
        row.label,
        row.publicId,
        row.appId,
      )
      const updated = await this.patch(row.id, {
        sessionId: created.sessionId,
        status: 'live',
        lastError: null,
        lastBoundAt: new Date(),
      })
      return this.toView(updated, created.token)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`ensureLive failed for ${tunnelId}: ${message}`)
      const updated = await this.patch(row.id, {
        status: 'error',
        lastError: message,
      })
      return this.toView(updated, null)
    }
  }

  /** Cheap listing — last-known status + metadata, no bridge calls, no token. */
  async list(
    scope: OwnerScope & { selectorKey: string },
  ): Promise<DurableTunnelView[]> {
    const rows =
      await this.ormService.db.query.dockerBridgeTunnelsTable.findMany({
        where: and(
          eq(dockerBridgeTunnelsTable.appId, scope.appId),
          eq(dockerBridgeTunnelsTable.userId, scope.userId),
          eq(dockerBridgeTunnelsTable.selectorKey, scope.selectorKey),
        ),
      })
    return rows.map((row) => this.toView(row, null))
  }

  /** Open path — ownership check, then full ensureLive (fresh url + token). */
  async get(tunnelId: string, scope: OwnerScope): Promise<DurableTunnelView> {
    await this.requireOwned(tunnelId, scope)
    return this.ensureLive(tunnelId)
  }

  /** Delete — bridge-first (404-tolerant), then drop the row. */
  async delete(tunnelId: string, scope: OwnerScope): Promise<void> {
    const row = await this.requireOwned(tunnelId, scope)
    if (row.sessionId) {
      await this.dockerClientService
        .deleteTunnelSession(row.sessionId, row.appId)
        .catch((err: unknown) => {
          this.logger.warn(
            `Bridge teardown for tunnel ${tunnelId} failed: ${err instanceof Error ? err.message : String(err)}`,
          )
        })
    }
    await this.ormService.db
      .delete(dockerBridgeTunnelsTable)
      .where(eq(dockerBridgeTunnelsTable.id, tunnelId))
  }

  /** All durable tunnel ids (drives bridge-reconnect bulk replay). */
  async listAllIds(): Promise<string[]> {
    const rows = await this.ormService.db
      .select({ id: dockerBridgeTunnelsTable.id })
      .from(dockerBridgeTunnelsTable)
    return rows.map((r) => r.id)
  }

  // ─── Private ────────────────────────────────────────────────────────────

  private async requireOwned(
    tunnelId: string,
    scope: OwnerScope,
  ): Promise<DockerBridgeTunnel> {
    const row =
      await this.ormService.db.query.dockerBridgeTunnelsTable.findFirst({
        where: eq(dockerBridgeTunnelsTable.id, tunnelId),
      })
    if (!row) {
      throw new NotFoundException(`Durable tunnel not found: ${tunnelId}`)
    }
    if (row.appId !== scope.appId || row.userId !== scope.userId) {
      throw new NotFoundException(`Durable tunnel not found: ${tunnelId}`)
    }
    return row
  }

  private snapshotSelector(container: ContainerInfo): Record<string, string> {
    const selector: Record<string, string> = {}
    for (const key of SELECTOR_LABELS) {
      const value = container.labels[key]
      if (value) {
        selector[key] = value
      }
    }
    return selector
  }

  private async resolveRunningContainer(
    row: DockerBridgeTunnel,
  ): Promise<ContainerInfo | undefined> {
    const containers = await this.dockerClientService.listContainersByLabels(
      row.hostId,
      row.containerSelector,
    )
    // Exclude containers carrying an identifying label the selector did not request (mirrors findOrCreateContainer).
    const hasIsolationKey = DOCKER_LABELS.ISOLATION_KEY in row.containerSelector
    const matching = containers.filter((container) => {
      if (!hasIsolationKey && container.labels[DOCKER_LABELS.ISOLATION_KEY]) {
        return false
      }
      return true
    })
    return matching.find((container) => container.state === 'running')
  }

  private async patch(
    id: string,
    fields: Partial<DockerBridgeTunnel>,
  ): Promise<DockerBridgeTunnel> {
    const [updated] = await this.ormService.db
      .update(dockerBridgeTunnelsTable)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(dockerBridgeTunnelsTable.id, id))
      .returning()
    if (!updated) {
      throw new NotFoundException(`Durable tunnel not found: ${id}`)
    }
    return updated
  }

  private async generateUniquePublicId(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const id = 'tn-' + crypto.randomBytes(5).toString('hex')
      const existing =
        await this.ormService.db.query.dockerBridgeTunnelsTable.findFirst({
          where: eq(dockerBridgeTunnelsTable.publicId, id),
        })
      if (!existing) {
        return id
      }
    }
    throw new Error('Failed to generate unique tunnel public id')
  }

  private toView(
    row: DockerBridgeTunnel,
    token: string | null,
  ): DurableTunnelView {
    return {
      id: row.id,
      port: row.port,
      label: row.label,
      publicId: row.publicId,
      url: this.dockerClientService.buildPublicTunnelUrl(
        row.publicId,
        row.label,
        row.appId,
      ),
      token,
      state: this.toState(row.status),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  private toState(status: DockerBridgeTunnel['status']): DurableTunnelState {
    switch (status) {
      case 'live':
        return 'live'
      case 'unavailable':
        return 'container_not_running'
      case 'error':
      case 'pending':
        return 'error'
    }
  }
}
