import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

const TEST_MODULE_KEY = 'auth_sessions'

describe('Auth Sessions', () => {
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

  it('should fail login with wrong password', async () => {
    await createTestUser(testModule!, {
      username: 'loginuser',
      password: 'correctpass',
    })

    const response = await apiClient().POST('/api/v1/auth/login', {
      body: { login: 'loginuser', password: 'wrongpass' },
    })
    expect(response.response.status).toEqual(401)
  })

  it('should fail login with non-existent user', async () => {
    const response = await apiClient().POST('/api/v1/auth/login', {
      body: { login: 'ghostuser', password: '123' },
    })
    expect(response.response.status).toEqual(401)
  })

  it('should login with email when provided', async () => {
    await createTestUser(testModule!, {
      username: 'emailuser',
      password: '123',
      email: 'emailuser@example.com',
    })

    const response = await apiClient().POST('/api/v1/auth/login', {
      body: { login: 'emailuser@example.com', password: '123' },
    })
    expect(response.response.status).toEqual(201)
    expect(response.data?.session.accessToken).toBeTruthy()
  })

  it('should get new tokens after refresh and old access token should still work until expiry', async () => {
    const {
      session: { accessToken: originalToken, refreshToken },
    } = await createTestUser(testModule!, {
      username: 'refreshuser',
      password: '123',
    })

    // Verify original token works
    const viewerBefore = await apiClient(originalToken).GET('/api/v1/viewer')
    expect(viewerBefore.response.status).toEqual(200)

    // Refresh
    const refreshResponse = await apiClient().POST(
      '/api/v1/auth/{refreshToken}',
      { params: { path: { refreshToken } } },
    )
    expect(refreshResponse.response.status).toEqual(201)
    expect(refreshResponse.data?.session.accessToken).toBeTruthy()
    expect(refreshResponse.data?.session.refreshToken).toBeTruthy()

    // New token should work
    const newToken = refreshResponse.data!.session.accessToken
    const viewerAfter = await apiClient(newToken).GET('/api/v1/viewer')
    expect(viewerAfter.response.status).toEqual(200)
    expect(viewerAfter.data?.user.username).toEqual('refreshuser')
  })

  it('should not reuse a refresh token after it has been consumed', async () => {
    const {
      session: { refreshToken },
    } = await createTestUser(testModule!, {
      username: 'reuse',
      password: '123',
    })

    // First refresh succeeds
    const first = await apiClient().POST('/api/v1/auth/{refreshToken}', {
      params: { path: { refreshToken } },
    })
    expect(first.response.status).toEqual(201)

    // Second refresh with same token should fail
    const second = await apiClient().POST('/api/v1/auth/{refreshToken}', {
      params: { path: { refreshToken } },
    })
    expect(second.response.status).toEqual(401)
  })

  it('should support multiple concurrent sessions for the same user', async () => {
    // First login
    const {
      session: { accessToken: token1 },
    } = await createTestUser(testModule!, {
      username: 'multilogin',
      password: '123',
    })

    // Second login (creates a new session)
    const login2 = await apiClient().POST('/api/v1/auth/login', {
      body: { login: 'multilogin', password: '123' },
    })
    expect(login2.response.status).toEqual(201)
    const token2 = login2.data!.session.accessToken

    // Both tokens should work
    const viewer1 = await apiClient(token1).GET('/api/v1/viewer')
    expect(viewer1.response.status).toEqual(200)

    const viewer2 = await apiClient(token2).GET('/api/v1/viewer')
    expect(viewer2.response.status).toEqual(200)

    // Both see the same user
    expect(viewer1.data?.user.username).toEqual('multilogin')
    expect(viewer2.data?.user.username).toEqual('multilogin')
  })

  it('should reject expired or invalid access tokens', async () => {
    const response = await apiClient('invalid.jwt.token').GET('/api/v1/viewer')
    expect(response.response.status).toEqual(401)
  })

  it('should login case-insensitively by username', async () => {
    await createTestUser(testModule!, {
      username: 'CaseyUser',
      password: 'mypass',
    })

    const response = await apiClient().POST('/api/v1/auth/login', {
      body: { login: 'caseyuser', password: 'mypass' },
    })
    expect(response.response.status).toEqual(201)
    expect(response.data?.session.accessToken).toBeTruthy()
  })
})
