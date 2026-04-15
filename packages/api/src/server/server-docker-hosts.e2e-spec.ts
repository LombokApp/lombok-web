import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

const TEST_MODULE_KEY = 'server_docker_hosts'

describe('Server Docker Hosts', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  it('should require authentication for docker hosts state', async () => {
    const response = await apiClient().GET('/api/v1/server/docker-hosts/state')
    expect(response.response.status).toEqual(401)
  })

  it('should require admin role for docker hosts state', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'nonadmin',
      password: '123',
    })

    const response = await apiClient(accessToken).GET(
      '/api/v1/server/docker-hosts/state',
    )
    expect(response.response.status).toEqual(401)
  })

  it('should return docker hosts state for admin', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'dockeradmin',
      password: '123',
      admin: true,
    })

    const response = await apiClient(accessToken).GET(
      '/api/v1/server/docker-hosts/state',
    )
    expect(response.response.status).toEqual(200)
    expect(response.data?.hosts).toBeDefined()
  })

  it('should require authentication for docker hosts list', async () => {
    const response = await apiClient().GET('/api/v1/docker/hosts')
    expect(response.response.status).toEqual(401)
  })

  it('should require admin role for docker hosts list', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'nonadmin2',
      password: '123',
    })

    const response = await apiClient(accessToken).GET('/api/v1/docker/hosts')
    expect(response.response.status).toEqual(401)
  })

  it('should return docker hosts list for admin', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'dockeradmin2',
      password: '123',
      admin: true,
    })

    const response = await apiClient(accessToken).GET('/api/v1/docker/hosts')
    expect(response.response.status).toEqual(200)
    expect(response.data?.result).toBeArray()
  })
})
