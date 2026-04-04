import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { v4 as uuidV4 } from 'uuid'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

const TEST_MODULE_KEY = 'adm_usr_sess'

describe('Admin User Sessions Listing', () => {
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

  async function getViewerUserId(accessToken: string) {
    const res = await apiClient(accessToken).GET('/api/v1/viewer')
    return res.data!.user.id
  }

  it('should require authentication', async () => {
    const res = await apiClient().GET(
      '/api/v1/server/users/{userId}/sessions',
      { params: { path: { userId: uuidV4() } } },
    )
    expect(res.response.status).toBe(401)
  })

  it('should require admin', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'sessnonadm',
      password: '123',
    })

    const userId = await getViewerUserId(accessToken)

    const res = await apiClient(accessToken).GET(
      '/api/v1/server/users/{userId}/sessions',
      { params: { path: { userId } } },
    )
    expect(res.response.status).toBe(401)
  })

  it('should list sessions for a user as admin', async () => {
    const {
      session: { accessToken: adminToken },
    } = await createTestUser(testModule!, {
      username: 'sessadmin',
      password: '123',
      admin: true,
    })

    // Create a target user who will have a session
    const {
      session: { accessToken: targetToken },
    } = await createTestUser(testModule!, {
      username: 'sesstarget',
      password: '123',
    })

    const targetUserId = await getViewerUserId(targetToken)

    const res = await apiClient(adminToken).GET(
      '/api/v1/server/users/{userId}/sessions',
      { params: { path: { userId: targetUserId } } },
    )
    expect(res.response.status).toBe(200)
    expect(res.data?.result).toBeArray()
    expect(res.data!.result.length).toBeGreaterThanOrEqual(1)
    expect(res.data?.meta).toBeDefined()
  })

  it('should return error for non-existent user', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'sess404adm',
      password: '123',
      admin: true,
    })

    const res = await apiClient(accessToken).GET(
      '/api/v1/server/users/{userId}/sessions',
      { params: { path: { userId: uuidV4() } } },
    )
    expect([400, 404]).toContain(res.response.status)
  })
})
