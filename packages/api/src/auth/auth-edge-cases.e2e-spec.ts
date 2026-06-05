import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { usersTable } from 'src/users/entities/user.entity'

const TEST_MODULE_KEY = 'auth_edge'

describe('Auth Edge Cases', () => {
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

  it('should reject login with wrong password', async () => {
    await createTestUser(testModule!, {
      username: 'wrongpw',
      password: 'correct123',
    })

    const res = await apiClient().POST('/api/v1/auth/login', {
      body: { login: 'wrongpw', password: 'incorrect' },
    })
    expect([400, 401]).toContain(res.response.status)
  })

  it('should reject login for non-existent user', async () => {
    const res = await apiClient().POST('/api/v1/auth/login', {
      body: { login: 'ghostuser', password: '123' },
    })
    expect([400, 401]).toContain(res.response.status)
  })

  it('should reject refresh with invalid token', async () => {
    const res = await apiClient().POST('/api/v1/auth/{refreshToken}', {
      params: { path: { refreshToken: 'invalid-token-string' } },
    })
    expect([400, 401]).toContain(res.response.status)
  })

  it('should reject signup with empty username', async () => {
    const res = await apiClient().POST('/api/v1/auth/signup', {
      body: { username: '', password: '123' },
    })
    expect([400, 422]).toContain(res.response.status)
  })

  it('should return valid tokens on successful login', async () => {
    await createTestUser(testModule!, {
      username: 'tokencheck',
      password: 'pass123',
    })

    const res = await apiClient().POST('/api/v1/auth/login', {
      body: { login: 'tokencheck', password: 'pass123' },
    })
    expect([200, 201]).toContain(res.response.status)
    expect(res.data?.session.accessToken).toBeTruthy()
    expect(res.data?.session.refreshToken).toBeTruthy()

    // Verify the token works for authenticated requests
    const viewerRes = await apiClient(res.data!.session.accessToken).GET(
      '/api/v1/viewer',
    )
    expect(viewerRes.response.status).toBe(200)
    expect(viewerRes.data?.user.username).toBe('tokencheck')
  })

  it('should successfully refresh a session', async () => {
    const {
      session: { refreshToken },
    } = await createTestUser(testModule!, {
      username: 'refreshtest',
      password: '123',
    })

    const res = await apiClient().POST('/api/v1/auth/{refreshToken}', {
      params: { path: { refreshToken } },
    })
    expect([200, 201]).toContain(res.response.status)
    expect(res.data?.session.accessToken).toBeTruthy()
    expect(res.data?.session.refreshToken).toBeTruthy()
  })

  it('should reject a valid token whose user no longer exists with 401', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'ghosttoken',
      password: 'pass123',
    })

    // Token is signature-valid; remove the user it refers to.
    await testModule!.services.ormService.db
      .delete(usersTable)
      .where(eq(usersTable.username, 'ghosttoken'))

    const res = await apiClient(accessToken).GET('/api/v1/folders')
    expect(res.response.status).toBe(401)
  })

  it('should reject a valid app-user token whose user no longer exists with 401', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'ghostappuser',
      password: 'pass123',
    })

    const viewer = await apiClient(accessToken).GET('/api/v1/viewer')
    const userId = viewer.data?.user.id
    if (!userId) {
      throw new Error('Failed to resolve user id')
    }

    // Mint a signature-valid app-user token with platform access for this user.
    const appUserToken =
      await testModule!.services.jwtService.createAppUserToken({
        session: {
          id: '11111111-1111-1111-1111-111111111111',
          hash: 'hash',
          userId,
          type: 'app_user',
          typeDetails: null,
          expiresAt: new Date(Date.now() + 60_000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        appIdentifier: 'auth-edge-app',
        platformAccess: true,
      })

    // Remove the user the token refers to.
    await testModule!.services.ormService.db
      .delete(usersTable)
      .where(eq(usersTable.id, userId))

    const res = await apiClient(appUserToken).GET('/api/v1/viewer')
    expect(res.response.status).toBe(401)
  })

  it('should not allow duplicate username signup', async () => {
    await createTestUser(testModule!, {
      username: 'dupeuser',
      password: '123',
    })

    const res = await apiClient().POST('/api/v1/auth/signup', {
      body: { username: 'dupeuser', password: '456' },
    })
    expect([400, 409]).toContain(res.response.status)
  })
})
