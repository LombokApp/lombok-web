import { CORE_APP_IDENTIFIER } from '@lombokapp/types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

const TEST_MODULE_KEY = 'user_apps'

describe('User Apps', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
    })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  it(`should list enabled apps for user`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    // First, enable the app as admin
    const {
      session: { accessToken: adminToken },
    } = await createTestUser(testModule!, {
      username: 'admin',
      password: '123',
      admin: true,
    })

    const appIdentifier = CORE_APP_IDENTIFIER
    const enableResponse = await apiClient(adminToken).PUT(
      `/api/v1/server/apps/{appIdentifier}/enabled`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
        body: { enabled: true },
      },
    )

    expect(enableResponse.response.status).toEqual(200)
    expect(enableResponse.data?.app.enabled).toBe(true)

    // Now test user endpoint
    const listAppsResponse =
      await apiClient(accessToken).GET('/api/v1/user/apps')

    expect(listAppsResponse.response.status).toEqual(200)
    expect(listAppsResponse.data).toBeDefined()
    if (!listAppsResponse.data) {
      throw new Error('No response data received')
    }
    expect(listAppsResponse.data.result.length).toBeGreaterThanOrEqual(1)
    expect(listAppsResponse.data.result.length).toEqual(
      listAppsResponse.data.meta.totalCount,
    )
    // Verify user app DTO doesn't have admin-only fields
    const app = listAppsResponse.data.result[0]!
    expect(app.identifier).toBeDefined()
    expect(app.label).toBeDefined()
    expect(app.enabled).toBe(true)
    // Should not have admin-only fields
    expect('publicKey' in app).toBe(false)
    expect('externalWorkers' in app).toBe(false)
    expect('metrics' in app).toBe(false)
    expect('requiresStorage' in app).toBe(false)
  })

  it(`should not list disabled apps for user`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser2',
      password: '123',
    })

    // Ensure app is disabled
    const {
      session: { accessToken: adminToken },
    } = await createTestUser(testModule!, {
      username: 'admin2',
      password: '123',
      admin: true,
    })

    const appIdentifier = CORE_APP_IDENTIFIER
    await apiClient(adminToken).PUT(
      `/api/v1/server/apps/{appIdentifier}/enabled`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
        body: { enabled: false },
      },
    )

    const listAppsResponse =
      await apiClient(accessToken).GET('/api/v1/user/apps')

    expect(listAppsResponse.response.status).toEqual(200)
    expect(listAppsResponse.data).toBeDefined()
    if (!listAppsResponse.data) {
      throw new Error('No response data received')
    }
    // Disabled apps should not appear in user list
    const coreApp = listAppsResponse.data.result.find(
      (app) => app.identifier === CORE_APP_IDENTIFIER,
    )
    expect(coreApp).toBeUndefined()
  })

  it(`should get enabled app by identifier for user`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser3',
      password: '123',
    })

    // Enable app as admin
    const {
      session: { accessToken: adminToken },
    } = await createTestUser(testModule!, {
      username: 'admin3',
      password: '123',
      admin: true,
    })

    const appIdentifier = CORE_APP_IDENTIFIER
    await apiClient(adminToken).PUT(
      `/api/v1/server/apps/{appIdentifier}/enabled`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
        body: { enabled: true },
      },
    )

    const getAppResponse = await apiClient(accessToken).GET(
      `/api/v1/user/apps/{appIdentifier}`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
      },
    )

    expect(getAppResponse.response.status).toEqual(200)
    expect(getAppResponse.data).toBeDefined()
    if (!getAppResponse.data) {
      throw new Error('No response data received')
    }
    expect(getAppResponse.data.app.identifier).toBe(appIdentifier)
    expect(getAppResponse.data.app.enabled).toBe(true)
    // Should not have admin-only fields
    expect('publicKey' in getAppResponse.data.app).toBe(false)
    expect('externalWorkers' in getAppResponse.data.app).toBe(false)
    expect('metrics' in getAppResponse.data.app).toBe(false)
  })

  it(`should return 404 for disabled app`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser4',
      password: '123',
    })

    // Disable app as admin
    const {
      session: { accessToken: adminToken },
    } = await createTestUser(testModule!, {
      username: 'admin4',
      password: '123',
      admin: true,
    })

    const appIdentifier = CORE_APP_IDENTIFIER
    await apiClient(adminToken).PUT(
      `/api/v1/server/apps/{appIdentifier}/enabled`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
        body: { enabled: false },
      },
    )

    const getAppResponse = await apiClient(accessToken).GET(
      `/api/v1/user/apps/{appIdentifier}`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
      },
    )

    expect(getAppResponse.response.status).toEqual(404)
  })

  it(`should return 404 for non-existent app`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser5',
      password: '123',
    })

    const getAppResponse = await apiClient(accessToken).GET(
      '/api/v1/user/apps/{appIdentifier}',
      {
        params: {
          path: {
            appIdentifier: 'non-existent-app',
          },
        },
      },
    )

    expect(getAppResponse.response.status).toEqual(404)
  })

  it(`should get app contributions`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser6',
      password: '123',
    })

    const contributionsResponse = await apiClient(accessToken).GET(
      '/api/v1/user/app-contributions',
    )

    expect(contributionsResponse.response.status).toEqual(200)
    expect(contributionsResponse.data).toBeDefined()
  })

  it(`should generate a valid user app access token`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser11',
      password: '123',
    })

    // Enable app as admin
    const {
      session: { accessToken: adminToken },
    } = await createTestUser(testModule!, {
      username: 'admin11',
      password: '123',
      admin: true,
    })

    const appIdentifier = CORE_APP_IDENTIFIER
    await apiClient(adminToken).PUT(
      `/api/v1/server/apps/{appIdentifier}/enabled`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
        body: { enabled: true },
      },
    )

    const generateTokenResponse = await apiClient(accessToken).POST(
      `/api/v1/user/apps/{appIdentifier}/access-token`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
      },
    )

    expect(generateTokenResponse.response.status).toEqual(201)
    expect(generateTokenResponse.data).toBeDefined()
    if (!generateTokenResponse.data) {
      throw new Error('No response data received')
    }
    expect(typeof generateTokenResponse.data.session.accessToken).toBe('string')
    expect(typeof generateTokenResponse.data.session.refreshToken).toBe(
      'string',
    )
    expect(generateTokenResponse.data.session.expiresAt).toBeDefined()

    // Verify token works
    const viewerResponse = await apiClient(
      generateTokenResponse.data.session.accessToken,
    ).GET(`/api/v1/viewer`)
    expect(viewerResponse.response.status).toEqual(200)
    expect(viewerResponse.data?.user.username).toBe('testuser11')
  })

  it(`should return 404 for non-existent app when generating access token`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser12',
      password: '123',
    })

    const appIdentifier = 'non-existent-app'
    const generateTokenResponse = await apiClient(accessToken).POST(
      `/api/v1/user/apps/{appIdentifier}/access-token`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
      },
    )

    expect(generateTokenResponse.response.status).toEqual(404)
  })

  it(`should require authentication for user apps endpoints`, async () => {
    const listAppsResponse = await apiClient().GET('/api/v1/user/apps')
    expect(listAppsResponse.response.status).toBe(401)

    const getAppResponse = await apiClient().GET(
      `/api/v1/user/apps/{appIdentifier}`,
      {
        params: {
          path: {
            appIdentifier: CORE_APP_IDENTIFIER,
          },
        },
      },
    )
    expect(getAppResponse.response.status).toBe(401)

    const contributionsResponse = await apiClient().GET(
      '/api/v1/user/app-contributions',
    )
    expect(contributionsResponse.response.status).toBe(401)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
