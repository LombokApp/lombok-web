import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  spyOn,
} from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestUser,
} from 'src/test/test.util'

import { DockerClientService } from '../services/client/docker-client.service'
import { DockerBridgeService } from '../services/docker-bridge.service'
import { buildMockDockerClientService } from './docker.e2e-mocks'

const TEST_MODULE_KEY = 'docker_host_management'
const TEST_APP_SLUG = 'testapp'

const adminCreds = { username: 'admin_dhm', password: '123', admin: true }

describe('Docker Host Management', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient
  let adminToken: string

  const mockDockerClient = buildMockDockerClientService()

  const createContainerSpy = spyOn(mockDockerClient, 'createContainer')
  const startContainerSpy = spyOn(mockDockerClient, 'startContainer')
  const stopContainerSpy = spyOn(mockDockerClient, 'stopContainer')
  const findContainerByIdSpy = spyOn(mockDockerClient, 'findContainerById')
  const pullImageSpy = spyOn(mockDockerClient, 'pullImage')

  const mockBridgeService = {
    syncHosts: async () => undefined,
    startBridge: async () => undefined,
    stopBridge: async () => undefined,
    getSecret: () => 'test-bridge-secret',
    onModuleInit: async () => undefined,
    onModuleDestroy: async () => undefined,
  }

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      overrides: [
        { token: DockerClientService, value: mockDockerClient },
        { token: DockerBridgeService, value: mockBridgeService },
      ],
    })
    apiClient = testModule.apiClient
  })

  beforeEach(async () => {
    createContainerSpy.mockClear()
    startContainerSpy.mockClear()
    stopContainerSpy.mockClear()
    findContainerByIdSpy.mockClear()
    pullImageSpy.mockClear()
    await testModule!.installLocalAppBundles([TEST_APP_SLUG])
    const signup = await createTestUser(testModule!, adminCreds)
    adminToken = signup.session.accessToken
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  // ────────────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────────────

  const createHost = async (
    overrides: Partial<{
      label: string
      host: string
      isDefault: boolean
      enabled: boolean
    }> = {},
  ) => {
    const response = await apiClient(adminToken).POST('/api/v1/docker/hosts', {
      body: {
        label: overrides.label ?? 'primary',
        type: 'docker_endpoint',
        host: overrides.host ?? '/var/run/docker.sock',
        ...(overrides.isDefault !== undefined && {
          isDefault: overrides.isDefault,
        }),
        ...(overrides.enabled !== undefined && { enabled: overrides.enabled }),
      },
    })
    if (!response.data?.result.id) {
      throw new Error(
        `Failed to create host: ${JSON.stringify(response.error ?? response.response.status)}`,
      )
    }
    return response.data.result
  }

  // ────────────────────────────────────────────────────────────────────────
  // 1. Auth guard — unauthenticated → 401
  // ────────────────────────────────────────────────────────────────────────
  it('1. requires authentication for hosts list', async () => {
    const response = await apiClient().GET('/api/v1/docker/hosts')
    expect(response.response.status).toBe(401)
  })

  // ────────────────────────────────────────────────────────────────────────
  // 2. Admin guard — non-admin → 401
  // ────────────────────────────────────────────────────────────────────────
  it('2. rejects non-admin users on hosts list', async () => {
    const nonAdmin = await createTestUser(testModule!, {
      username: 'regular_dhm',
      password: '123',
    })
    const response = await apiClient(nonAdmin.session.accessToken).GET(
      '/api/v1/docker/hosts',
    )
    expect(response.response.status).toBe(401)
  })

  // ────────────────────────────────────────────────────────────────────────
  // 3. Host CRUD roundtrip
  // ────────────────────────────────────────────────────────────────────────
  it('3. host CRUD roundtrip: create → list → update → delete', async () => {
    const created = await createHost({ label: 'crud-host' })
    expect(created.label).toBe('crud-host')
    expect(created.enabled).toBe(true)
    expect(created.isDefault).toBe(false)
    expect(created.healthStatus).toBe('unknown')

    const listResponse = await apiClient(adminToken).GET('/api/v1/docker/hosts')
    expect(listResponse.response.status).toBe(200)
    expect(listResponse.data?.result).toHaveLength(1)
    expect(listResponse.data?.result[0]?.id).toBe(created.id)

    const updateResponse = await apiClient(adminToken).PUT(
      '/api/v1/docker/hosts/{id}',
      {
        params: { path: { id: created.id } },
        body: { label: 'renamed', enabled: false },
      },
    )
    expect(updateResponse.response.status).toBe(200)
    expect(updateResponse.data?.result.label).toBe('renamed')
    expect(updateResponse.data?.result.enabled).toBe(false)

    const deleteResponse = await apiClient(adminToken).DELETE(
      '/api/v1/docker/hosts/{id}',
      { params: { path: { id: created.id } } },
    )
    expect(deleteResponse.response.status).toBe(200)

    const getAfterDelete = await apiClient(adminToken).GET(
      '/api/v1/docker/hosts/{id}',
      { params: { path: { id: created.id } } },
    )
    expect(getAfterDelete.response.status).toBe(404)
  })

  // ────────────────────────────────────────────────────────────────────────
  // 4. isDefault uniqueness
  // ────────────────────────────────────────────────────────────────────────
  it('4. creating a second default host clears the first', async () => {
    const hostA = await createHost({ label: 'a', isDefault: true })
    const hostB = await createHost({ label: 'b', isDefault: true })

    const listResponse = await apiClient(adminToken).GET('/api/v1/docker/hosts')
    const defaults = (listResponse.data?.result ?? []).filter(
      (h) => h.isDefault,
    )
    expect(defaults).toHaveLength(1)
    expect(defaults[0]?.id).toBe(hostB.id)

    await apiClient(adminToken).PUT('/api/v1/docker/hosts/{id}', {
      params: { path: { id: hostA.id } },
      body: { isDefault: true },
    })

    const listResponse2 = await apiClient(adminToken).GET(
      '/api/v1/docker/hosts',
    )
    const defaults2 = (listResponse2.data?.result ?? []).filter(
      (h) => h.isDefault,
    )
    expect(defaults2).toHaveLength(1)
    expect(defaults2[0]?.id).toBe(hostA.id)
  })

  // ────────────────────────────────────────────────────────────────────────
  // 5. Input validation
  // ────────────────────────────────────────────────────────────────────────
  it('5. rejects invalid host input', async () => {
    const emptyLabel = await apiClient(adminToken).POST(
      '/api/v1/docker/hosts',
      {
        body: {
          label: '',
          type: 'docker_endpoint',
          host: '/var/run/docker.sock',
        },
      },
    )
    expect(emptyLabel.response.status).toBe(400)

    const missingHost = await apiClient(adminToken).POST(
      '/api/v1/docker/hosts',
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body: { label: 'x', type: 'docker_endpoint' } as any,
      },
    )
    expect(missingHost.response.status).toBe(400)
  })

  // ────────────────────────────────────────────────────────────────────────
  // 6. Delete-host guard
  // ────────────────────────────────────────────────────────────────────────
  it('6. blocks host deletion while assignments reference it', async () => {
    const host = await createHost({ label: 'blocked' })

    const assignment = await apiClient(adminToken).POST(
      '/api/v1/docker/profile-assignments',
      {
        body: {
          appIdentifier: TEST_APP_SLUG,
          profileKey: 'dummy_profile',
          dockerHostId: host.id,
          config: {},
        },
      },
    )
    expect(assignment.response.status).toBeLessThan(300)

    const blocked = await apiClient(adminToken).DELETE(
      '/api/v1/docker/hosts/{id}',
      { params: { path: { id: host.id } } },
    )
    expect(blocked.response.status).toBe(400)

    const stillExists = await apiClient(adminToken).GET(
      '/api/v1/docker/hosts/{id}',
      { params: { path: { id: host.id } } },
    )
    expect(stillExists.response.status).toBe(200)

    await apiClient(adminToken).DELETE(
      '/api/v1/docker/profile-assignments/{id}',
      { params: { path: { id: assignment.data!.result.id } } },
    )

    const unblocked = await apiClient(adminToken).DELETE(
      '/api/v1/docker/hosts/{id}',
      { params: { path: { id: host.id } } },
    )
    expect(unblocked.response.status).toBe(200)
  })

  // ────────────────────────────────────────────────────────────────────────
  // 7. Registry credential CRUD
  // ────────────────────────────────────────────────────────────────────────
  it('7. registry credential CRUD roundtrip', async () => {
    const create = await apiClient(adminToken).POST(
      '/api/v1/docker/registry-credentials',
      {
        body: {
          registry: 'ghcr.io',
          serverAddress: 'https://ghcr.io',
          username: 'u',
          password: 'p1',
        },
      },
    )
    expect(create.response.status).toBeLessThan(300)
    const credId = create.data!.result.id

    const list = await apiClient(adminToken).GET(
      '/api/v1/docker/registry-credentials',
    )
    expect(list.data?.result).toHaveLength(1)
    expect(list.data?.result[0]?.registry).toBe('ghcr.io')
    expect(list.data?.result[0]?.password).toBe('p1')

    const update = await apiClient(adminToken).PUT(
      '/api/v1/docker/registry-credentials/{id}',
      {
        params: { path: { id: credId } },
        body: { password: 'p2' },
      },
    )
    expect(update.data?.result.password).toBe('p2')
    expect(update.data?.result.username).toBe('u')

    const del = await apiClient(adminToken).DELETE(
      '/api/v1/docker/registry-credentials/{id}',
      { params: { path: { id: credId } } },
    )
    expect(del.response.status).toBe(200)

    const listAfter = await apiClient(adminToken).GET(
      '/api/v1/docker/registry-credentials',
    )
    expect(listAfter.data?.result).toHaveLength(0)
  })

  // ────────────────────────────────────────────────────────────────────────
  // 8. Profile assignment create (happy path)
  // ────────────────────────────────────────────────────────────────────────
  it('8. creates a profile assignment with computed config hashes', async () => {
    const host = await createHost()
    const response = await apiClient(adminToken).POST(
      '/api/v1/docker/profile-assignments',
      {
        body: {
          appIdentifier: TEST_APP_SLUG,
          profileKey: 'dummy_profile',
          dockerHostId: host.id,
          config: {
            gpus: { driver: 'nvidia', deviceIds: ['0'] },
            volumes: ['/tmp/cache:/cache'],
          },
        },
      },
    )
    expect(response.response.status).toBeLessThan(300)
    const assignment = response.data!.result
    expect(assignment.appIdentifier).toBe(TEST_APP_SLUG)
    expect(assignment.profileKey).toBe('dummy_profile')
    expect(assignment.dockerHostId).toBe(host.id)
    expect(assignment.configHashes.gpus).toBeDefined()
    expect(assignment.configHashes.volumes).toBeDefined()
    expect(assignment.configHashes.gpus).toMatch(/^[0-9a-f]{12}$/)
  })

  // ────────────────────────────────────────────────────────────────────────
  // 9. Profile assignment with unknown host → 404
  // ────────────────────────────────────────────────────────────────────────
  it('9. rejects assignment referencing unknown host', async () => {
    const response = await apiClient(adminToken).POST(
      '/api/v1/docker/profile-assignments',
      {
        body: {
          appIdentifier: TEST_APP_SLUG,
          profileKey: 'dummy_profile',
          dockerHostId: '00000000-0000-4000-8000-000000000000',
          config: {},
        },
      },
    )
    expect(response.response.status).toBe(404)
  })

  // ────────────────────────────────────────────────────────────────────────
  // 10. Profile assignment list filter by appIdentifier
  // ────────────────────────────────────────────────────────────────────────
  it('10. lists profile assignments filtered by appIdentifier', async () => {
    await testModule!.installLocalAppBundles(['dummy'])
    const host = await createHost()

    await apiClient(adminToken).POST('/api/v1/docker/profile-assignments', {
      body: {
        appIdentifier: TEST_APP_SLUG,
        profileKey: 'dummy_profile',
        dockerHostId: host.id,
        config: {},
      },
    })
    await apiClient(adminToken).POST('/api/v1/docker/profile-assignments', {
      body: {
        appIdentifier: 'dummy',
        profileKey: 'dummy_profile',
        dockerHostId: host.id,
        config: {},
      },
    })

    const filtered = await apiClient(adminToken).GET(
      '/api/v1/docker/profile-assignments',
      { params: { query: { appIdentifier: TEST_APP_SLUG } } },
    )
    expect(filtered.data?.result).toHaveLength(1)
    expect(filtered.data?.result[0]?.appIdentifier).toBe(TEST_APP_SLUG)

    const all = await apiClient(adminToken).GET(
      '/api/v1/docker/profile-assignments',
    )
    expect(all.data?.result).toHaveLength(2)
  })

  // ────────────────────────────────────────────────────────────────────────
  // 11. Resolve — exact match
  // ────────────────────────────────────────────────────────────────────────
  it('11. resolve returns the exact-match assignment', async () => {
    const host = await createHost({ label: 'exact' })
    await apiClient(adminToken).POST('/api/v1/docker/profile-assignments', {
      body: {
        appIdentifier: TEST_APP_SLUG,
        profileKey: 'dummy_profile',
        dockerHostId: host.id,
        config: { gpus: { driver: 'nvidia', deviceIds: ['0', '1'] } },
      },
    })

    const resolved = await apiClient(adminToken).GET(
      '/api/v1/docker/profile-assignments/resolve/{appIdentifier}/{profileKey}',
      {
        params: {
          path: {
            appIdentifier: TEST_APP_SLUG,
            profileKey: 'dummy_profile',
          },
        },
      },
    )
    expect(resolved.response.status).toBe(200)
    expect(resolved.data?.result.hostId).toBe(host.id)
    expect(resolved.data?.result.hostLabel).toBe('exact')
    expect(resolved.data?.result.resourceConfig?.gpus?.deviceIds).toEqual([
      '0',
      '1',
    ])
  })

  // ────────────────────────────────────────────────────────────────────────
  // 12. Resolve — app `_default` fallback
  // ────────────────────────────────────────────────────────────────────────
  it('12. resolve falls through to app _default assignment', async () => {
    const host = await createHost({ label: 'app-default' })
    await apiClient(adminToken).POST('/api/v1/docker/profile-assignments', {
      body: {
        appIdentifier: TEST_APP_SLUG,
        profileKey: '_default',
        dockerHostId: host.id,
        config: { volumes: ['/data:/data'] },
      },
    })

    const resolved = await apiClient(adminToken).GET(
      '/api/v1/docker/profile-assignments/resolve/{appIdentifier}/{profileKey}',
      {
        params: {
          path: {
            appIdentifier: TEST_APP_SLUG,
            profileKey: 'unmapped_profile',
          },
        },
      },
    )
    expect(resolved.response.status).toBe(200)
    expect(resolved.data?.result.hostId).toBe(host.id)
    expect(resolved.data?.result.resourceConfig?.volumes).toEqual([
      '/data:/data',
    ])
  })

  // ────────────────────────────────────────────────────────────────────────
  // 13. Resolve — global default fallback
  // ────────────────────────────────────────────────────────────────────────
  it('13. resolve falls through to the global default host', async () => {
    const host = await createHost({ label: 'global', isDefault: true })

    const resolved = await apiClient(adminToken).GET(
      '/api/v1/docker/profile-assignments/resolve/{appIdentifier}/{profileKey}',
      {
        params: {
          path: {
            appIdentifier: 'unknown_app',
            profileKey: 'any_profile',
          },
        },
      },
    )
    expect(resolved.response.status).toBe(200)
    expect(resolved.data?.result.hostId).toBe(host.id)
    expect(resolved.data?.result.resourceConfig).toBeNull()
  })

  // ────────────────────────────────────────────────────────────────────────
  // 14. Resolve — no default host → 404
  // ────────────────────────────────────────────────────────────────────────
  it('14. resolve fails with 404 when no default host is configured', async () => {
    await createHost({ label: 'non-default', isDefault: false })
    const resolved = await apiClient(adminToken).GET(
      '/api/v1/docker/profile-assignments/resolve/{appIdentifier}/{profileKey}',
      {
        params: {
          path: {
            appIdentifier: 'unknown_app',
            profileKey: 'any_profile',
          },
        },
      },
    )
    expect(resolved.response.status).toBe(404)
  })

  // ────────────────────────────────────────────────────────────────────────
  // 15. Profile assignment update recomputes config hashes
  // ────────────────────────────────────────────────────────────────────────
  it('15. updating assignment config recomputes configHashes', async () => {
    const host = await createHost()
    const created = await apiClient(adminToken).POST(
      '/api/v1/docker/profile-assignments',
      {
        body: {
          appIdentifier: TEST_APP_SLUG,
          profileKey: 'dummy_profile',
          dockerHostId: host.id,
          config: { gpus: { driver: 'nvidia', deviceIds: ['0'] } },
        },
      },
    )
    const assignmentId = created.data!.result.id
    const originalHash = created.data!.result.configHashes.gpus

    const updated = await apiClient(adminToken).PUT(
      '/api/v1/docker/profile-assignments/{id}',
      {
        params: { path: { id: assignmentId } },
        body: {
          config: { gpus: { driver: 'nvidia', deviceIds: ['1'] } },
        },
      },
    )
    expect(updated.response.status).toBe(200)
    expect(updated.data?.result.configHashes.gpus).toBeDefined()
    expect(updated.data?.result.configHashes.gpus).not.toBe(originalHash)
  })

  // ────────────────────────────────────────────────────────────────────────
  // 16. Standalone container create persists row and calls docker client
  // ────────────────────────────────────────────────────────────────────────
  it('16. creates a standalone container with platform labels', async () => {
    const host = await createHost()
    createContainerSpy.mockImplementationOnce(async () => ({
      id: 'container-abc',
      image: 'redis:7',
      labels: {},
      state: 'created' as const,
      reusable: false,
      createdAt: new Date().toISOString(),
    }))

    const response = await apiClient(adminToken).POST(
      '/api/v1/docker/standalone-containers',
      {
        body: {
          dockerHostId: host.id,
          label: 'cache',
          image: 'redis',
          tag: '7',
          desiredStatus: 'stopped',
          config: { env: { FOO: 'bar' } },
        },
      },
    )
    expect(response.response.status).toBeLessThan(300)
    const container = response.data!.result
    expect(container.containerId).toBe('container-abc')
    expect(container.image).toBe('redis')
    expect(container.tag).toBe('7')
    expect(container.desiredStatus).toBe('stopped')

    expect(createContainerSpy).toHaveBeenCalledTimes(1)
    const [calledHostId, createOptions] = createContainerSpy.mock.calls[0] as [
      string,
      {
        image: string
        labels: Record<string, string>
        start: boolean
        env?: Record<string, string>
      },
    ]
    expect(calledHostId).toBe(host.id)
    expect(createOptions.image).toBe('redis:7')
    expect(createOptions.start).toBe(false)
    expect(createOptions.labels['lombok.container_type']).toBe('standalone')
    expect(createOptions.labels['lombok.standalone_container_id']).toBe(
      container.id,
    )
    expect(createOptions.labels['lombok.platform_host']).toBe('localhost')
    expect(createOptions.env?.FOO).toBe('bar')
  })

  // ────────────────────────────────────────────────────────────────────────
  // 17. Standalone container with desiredStatus=running starts on create
  // ────────────────────────────────────────────────────────────────────────
  it('17. desiredStatus=running creates container with start=true', async () => {
    const host = await createHost()
    createContainerSpy.mockImplementationOnce(async () => ({
      id: 'container-running',
      image: 'nginx:latest',
      labels: {},
      state: 'running' as const,
      reusable: false,
      createdAt: new Date().toISOString(),
    }))

    const response = await apiClient(adminToken).POST(
      '/api/v1/docker/standalone-containers',
      {
        body: {
          dockerHostId: host.id,
          label: 'web',
          image: 'nginx',
          tag: 'latest',
          desiredStatus: 'running',
          config: {},
        },
      },
    )
    expect(response.response.status).toBeLessThan(300)
    expect(createContainerSpy).toHaveBeenCalledTimes(1)
    const createOptions = createContainerSpy.mock.calls[0]![1] as {
      start: boolean
    }
    expect(createOptions.start).toBe(true)
  })

  // ────────────────────────────────────────────────────────────────────────
  // 18. Standalone desired-status reconciliation (stopped→running→stopped)
  // ────────────────────────────────────────────────────────────────────────
  it('18. desired-status endpoint reconciles container state', async () => {
    const host = await createHost()
    createContainerSpy.mockImplementationOnce(async () => ({
      id: 'container-reconcile',
      image: 'busybox:latest',
      labels: {},
      state: 'exited' as const,
      reusable: false,
      createdAt: new Date().toISOString(),
    }))

    const create = await apiClient(adminToken).POST(
      '/api/v1/docker/standalone-containers',
      {
        body: {
          dockerHostId: host.id,
          label: 'reconcile',
          image: 'busybox',
          tag: 'latest',
          desiredStatus: 'stopped',
          config: {},
        },
      },
    )
    const containerDbId = create.data!.result.id

    // Transition: stopped → running — expect startContainer call
    findContainerByIdSpy.mockImplementationOnce(async () => ({
      id: 'container-reconcile',
      image: 'busybox:latest',
      labels: {},
      state: 'exited' as const,
      reusable: false,
      createdAt: new Date().toISOString(),
    }))
    const toRunning = await apiClient(adminToken).POST(
      '/api/v1/docker/standalone-containers/{id}/desired-status',
      {
        params: { path: { id: containerDbId } },
        body: { desiredStatus: 'running' },
      },
    )
    expect(toRunning.response.status).toBeLessThan(300)
    expect(toRunning.data?.result.desiredStatus).toBe('running')
    expect(startContainerSpy).toHaveBeenCalledTimes(1)
    expect(startContainerSpy.mock.calls[0]).toEqual([
      host.id,
      'container-reconcile',
    ])

    // Transition: running → stopped — expect stopContainer call
    findContainerByIdSpy.mockImplementationOnce(async () => ({
      id: 'container-reconcile',
      image: 'busybox:latest',
      labels: {},
      state: 'running' as const,
      reusable: false,
      createdAt: new Date().toISOString(),
    }))
    const toStopped = await apiClient(adminToken).POST(
      '/api/v1/docker/standalone-containers/{id}/desired-status',
      {
        params: { path: { id: containerDbId } },
        body: { desiredStatus: 'stopped' },
      },
    )
    expect(toStopped.response.status).toBeLessThan(300)
    expect(toStopped.data?.result.desiredStatus).toBe('stopped')
    expect(stopContainerSpy).toHaveBeenCalledTimes(1)
    expect(stopContainerSpy.mock.calls[0]).toEqual([
      host.id,
      'container-reconcile',
    ])
  })

  // ────────────────────────────────────────────────────────────────────────
  // 19. Standalone container list filtered by host
  // ────────────────────────────────────────────────────────────────────────
  it('19. lists standalone containers filtered by dockerHostId', async () => {
    const hostA = await createHost({
      label: 'host-a',
      host: '/var/run/docker-a.sock',
    })
    const hostB = await createHost({
      label: 'host-b',
      host: '/var/run/docker-b.sock',
    })

    createContainerSpy.mockImplementation(async (hostId: string) => ({
      id: `c-${hostId.slice(0, 6)}`,
      image: 'busybox:latest',
      labels: {},
      state: 'created' as const,
      reusable: false,
      createdAt: new Date().toISOString(),
    }))

    await apiClient(adminToken).POST('/api/v1/docker/standalone-containers', {
      body: {
        dockerHostId: hostA.id,
        label: 'on-a',
        image: 'busybox',
        tag: 'latest',
        desiredStatus: 'stopped',
        config: {},
      },
    })
    await apiClient(adminToken).POST('/api/v1/docker/standalone-containers', {
      body: {
        dockerHostId: hostB.id,
        label: 'on-b',
        image: 'busybox',
        tag: 'latest',
        desiredStatus: 'stopped',
        config: {},
      },
    })

    const filtered = await apiClient(adminToken).GET(
      '/api/v1/docker/standalone-containers',
      { params: { query: { dockerHostId: hostA.id } } },
    )
    expect(filtered.data?.result).toHaveLength(1)
    expect(filtered.data?.result[0]?.dockerHostId).toBe(hostA.id)
    expect(filtered.data?.result[0]?.label).toBe('on-a')

    const all = await apiClient(adminToken).GET(
      '/api/v1/docker/standalone-containers',
    )
    expect(all.data?.result).toHaveLength(2)
  })

  // ────────────────────────────────────────────────────────────────────────
  // 20. Standalone container create pulls image with registry credentials
  // ────────────────────────────────────────────────────────────────────────
  it('20. pulls image with credentials when registry matches', async () => {
    const host = await createHost()

    await apiClient(adminToken).POST(
      '/api/v1/docker/registry-credentials',
      {
        body: {
          registry: 'ghcr.io',
          serverAddress: 'https://ghcr.io',
          username: 'ghcr-user',
          password: 'ghcr-pass',
        },
      },
    )

    createContainerSpy.mockImplementationOnce(async () => ({
      id: 'container-private',
      image: 'ghcr.io/org/app:v1',
      labels: {},
      state: 'created' as const,
      reusable: false,
      createdAt: new Date().toISOString(),
    }))

    const response = await apiClient(adminToken).POST(
      '/api/v1/docker/standalone-containers',
      {
        body: {
          dockerHostId: host.id,
          label: 'private-image',
          image: 'ghcr.io/org/app',
          tag: 'v1',
          desiredStatus: 'stopped',
          config: {},
        },
      },
    )
    expect(response.response.status).toBeLessThan(300)

    expect(pullImageSpy).toHaveBeenCalledTimes(1)
    expect(pullImageSpy.mock.calls[0]).toEqual([
      host.id,
      'ghcr.io/org/app:v1',
      {
        username: 'ghcr-user',
        password: 'ghcr-pass',
        serveraddress: 'https://ghcr.io',
      },
    ])
  })
})
