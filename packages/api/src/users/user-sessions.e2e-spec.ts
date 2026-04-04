import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { v4 as uuidV4 } from 'uuid'

const TEST_MODULE_KEY = 'user_sessions'

describe('User Sessions (Admin)', () => {
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
      {
        params: { path: { userId: uuidV4() } },
      },
    )
    expect(res.response.status).toBe(401)
  })

  it('should require admin role', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'nonadmin',
      password: '123',
    })

    const userId = await getViewerUserId(accessToken)

    const res = await apiClient(accessToken).GET(
      '/api/v1/server/users/{userId}/sessions',
      { params: { path: { userId } } },
    )
    expect(res.response.status).toBe(401)
  })

  it('should list active sessions for a user', async () => {
    const {
      session: { accessToken: adminToken },
    } = await createTestUser(testModule!, {
      username: 'sessadmin',
      password: '123',
      admin: true,
    })

    // Create a target user who logs in (creating a session)
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
    expect(res.data!.meta.totalCount).toBeGreaterThanOrEqual(1)

    // Verify session structure
    const session = res.data!.result[0]!
    expect(session.createdAt).toBeTruthy()
    expect(session.expiresAt).toBeTruthy()
  })

  it('should return 404 for non-existent user', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'sessadmin2',
      password: '123',
      admin: true,
    })

    const res = await apiClient(accessToken).GET(
      '/api/v1/server/users/{userId}/sessions',
      { params: { path: { userId: uuidV4() } } },
    )
    expect([404, 400]).toContain(res.response.status)
  })
})
