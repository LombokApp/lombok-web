import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

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
