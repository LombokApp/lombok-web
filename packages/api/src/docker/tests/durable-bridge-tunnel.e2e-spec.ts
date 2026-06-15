import { NotFoundException } from '@nestjs/common'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestUser,
  seedDockerHost,
  TEST_DOCKER_HOST_ID,
} from 'src/test/test.util'

import { appsTable } from '../../app/entities/app.entity'
import { usersTable } from '../../users/entities/user.entity'
import { dockerBridgeTunnelsTable } from '../entities/docker-bridge-tunnel.entity'
import { DockerClientService } from '../services/client/docker-client.service'
import { DockerBridgeService } from '../services/docker-bridge.service'
import { DOCKER_LABELS } from '../services/docker-jobs.service'
import { DurableTunnelService } from '../services/durable-tunnel.service'

const TEST_MODULE_KEY = 'durable_bridge_tunnel'
const TEST_APP_SLUG = 'testapp'
const HOST_ID = TEST_DOCKER_HOST_ID

/**
 * A controllable stand-in for the bridge-facing half of DockerClientService.
 * Tests drive which container is "running" and what the bridge reports for a
 * session; the world records the durable create/delete calls. App/user ids are
 * read live from the closed-over refs so a single instance survives re-install.
 */
function buildBridgeWorld(getAppId: () => string, getUserId: () => string) {
  const world = {
    container: { id: 'container-1', state: 'running' as 'running' | 'exited' },
    sessions: new Map<
      string,
      {
        id: string
        container_id: string
        public_id: string | null
        agent_ready: boolean
      }
    >(),
    createCalls: 0,
    deleteCalls: [] as string[],
    sessionSeq: 0,
    reset() {
      this.container = { id: 'container-1', state: 'running' }
      this.sessions.clear()
      this.createCalls = 0
      this.deleteCalls = []
      this.sessionSeq = 0
    },
  }

  const labelsFor = (id: string) => ({
    [DOCKER_LABELS.APP_ID]: getAppId(),
    [DOCKER_LABELS.USER_ID]: getUserId(),
    id,
  })

  const containerInfo = () => ({
    id: world.container.id,
    image: 'img',
    labels: labelsFor(world.container.id),
    state: world.container.state,
    reusable: true,
    createdAt: new Date().toISOString(),
  })

  const mock = {
    findContainerById: async (_hostId: string, containerId: string) =>
      world.container.id === containerId ? containerInfo() : undefined,
    listContainersByLabels: async () => [containerInfo()],
    getSessionById: async (sessionId: string) =>
      world.sessions.get(sessionId) ?? null,
    createDurableTunnelSession: async (
      _hostId: string,
      containerId: string,
      _command: string[],
      label: string,
      publicId: string,
      appIdentifier: string,
    ) => {
      world.createCalls += 1
      const sessionId = `sess-${++world.sessionSeq}`
      world.sessions.set(sessionId, {
        id: sessionId,
        container_id: containerId,
        public_id: publicId,
        agent_ready: true,
      })
      return {
        sessionId,
        publicId,
        url: `https://${label}--${publicId}--${appIdentifier}.example.test`,
        token: `token-${sessionId}`,
      }
    },
    mintDurableTunnelToken: async (sessionId: string) => `token-${sessionId}`,
    buildPublicTunnelUrl: (
      publicId: string,
      label: string,
      appIdentifier: string,
    ) => `https://${label}--${publicId}--${appIdentifier}.example.test`,
    deleteTunnelSession: async (sessionId: string) => {
      world.deleteCalls.push(sessionId)
      world.sessions.delete(sessionId)
    },
  }

  return { world, mock: mock as unknown as DockerClientService }
}

describe('Durable bridge tunnels', () => {
  let testModule: TestModule | undefined
  let durableTunnelService: DurableTunnelService
  let appId = '__pending__'
  let userId = '__pending__'
  let world: ReturnType<typeof buildBridgeWorld>['world']

  const mockBridgeService = {
    syncHosts: async () => undefined,
    startBridge: async () => undefined,
    stopBridge: async () => undefined,
    getSecret: () => 'test-bridge-secret',
    isReady: () => true,
    onReady: () => () => undefined,
    onModuleInit: async () => undefined,
    onModuleDestroy: async () => undefined,
  }

  beforeAll(async () => {
    const built = buildBridgeWorld(
      () => appId,
      () => userId,
    )
    world = built.world
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      overrides: [
        { token: DockerClientService, value: built.mock },
        { token: DockerBridgeService, value: mockBridgeService },
      ],
    })
    durableTunnelService = testModule.app.get(DurableTunnelService)
  })

  beforeEach(async () => {
    await testModule!.resetAppState()
    await testModule!.installLocalAppBundles([TEST_APP_SLUG])
    await seedDockerHost(testModule!)

    const app =
      await testModule!.services.ormService.db.query.appsTable.findFirst({
        where: eq(appsTable.slug, TEST_APP_SLUG),
      })
    appId = app!.identifier

    await createTestUser(testModule!, {
      username: 'tunnel_user',
      password: '123',
    })
    const user =
      await testModule!.services.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.username, 'tunnel_user'),
      })
    userId = user!.id

    world.reset()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  const createOne = () =>
    durableTunnelService.create({
      appId,
      userId,
      hostId: HOST_ID,
      containerId: 'container-1',
      selectorKey: 'workspace-1',
      port: 5173,
      label: 'preview',
      command: ['/usr/local/bin/lombok-tunnel-agent', '--ports', '5173'],
    })

  it('creates a live tunnel with a stable tn- publicId and a token', async () => {
    const view = await createOne()
    expect(view.state).toBe('live')
    expect(view.publicId).toMatch(/^tn-[a-z0-9]+$/)
    expect(view.token).toBeTruthy()
    expect(world.createCalls).toBe(1)
  })

  it('is idempotent on the unique scope tuple (same publicId)', async () => {
    const first = await createOne()
    const second = await createOne()
    expect(second.id).toBe(first.id)
    expect(second.publicId).toBe(first.publicId)

    const rows = await testModule!.services.ormService.db
      .select()
      .from(dockerBridgeTunnelsTable)
    expect(rows).toHaveLength(1)
  })

  it('reuses a healthy session on ensure (no recreate)', async () => {
    const created = await createOne()
    const callsAfterCreate = world.createCalls

    const ensured = await durableTunnelService.get(created.id, {
      appId,
      userId,
    })
    expect(ensured.state).toBe('live')
    expect(ensured.publicId).toBe(created.publicId)
    expect(world.createCalls).toBe(callsAfterCreate)
  })

  it('re-binds under the stable publicId after the container is recreated', async () => {
    const created = await createOne()
    const oldSessionId = world.sessions.keys().next().value!

    // Container recreated with a new id; the old session is now stale.
    world.container = { id: 'container-2', state: 'running' }

    const reBound = await durableTunnelService.get(created.id, {
      appId,
      userId,
    })
    expect(reBound.state).toBe('live')
    expect(reBound.publicId).toBe(created.publicId)
    expect(world.deleteCalls).toContain(oldSessionId)
    expect(world.createCalls).toBe(2)
  })

  it('reports container_not_running when no container is live (no auto-start)', async () => {
    const created = await createOne()
    const callsAfterCreate = world.createCalls

    world.container = { id: 'container-1', state: 'exited' }

    const ensured = await durableTunnelService.get(created.id, {
      appId,
      userId,
    })
    expect(ensured.state).toBe('container_not_running')
    expect(ensured.token).toBeNull()
    expect(world.createCalls).toBe(callsAfterCreate)

    const [row] = await testModule!.services.ormService.db
      .select()
      .from(dockerBridgeTunnelsTable)
      .where(eq(dockerBridgeTunnelsTable.id, created.id))
    expect(row).toBeDefined()
    expect(row!.sessionId).toBeNull()
    expect(row!.status).toBe('unavailable')
  })

  it('deletes bridge-first then the row', async () => {
    const created = await createOne()
    const sessionId = world.sessions.keys().next().value!

    await durableTunnelService.delete(created.id, { appId, userId })

    expect(world.deleteCalls).toContain(sessionId)
    const rows = await testModule!.services.ormService.db
      .select()
      .from(dockerBridgeTunnelsTable)
    expect(rows).toHaveLength(0)
  })

  it('rejects access for a mismatched userId', async () => {
    const created = await createOne()
    let caught: unknown
    try {
      await durableTunnelService.get(created.id, {
        appId,
        userId: '11111111-1111-1111-1111-111111111111',
      })
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(NotFoundException)
  })
})
