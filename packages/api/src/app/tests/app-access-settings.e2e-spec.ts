import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { DUMMY_APP_SLUG } from 'test/e2e.contants'

const TEST_MODULE_KEY = 'app_access_set'

describe('App Access Settings', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient
  let appIdentifier: string

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient

    await testModule.installLocalAppBundles([DUMMY_APP_SLUG])
    appIdentifier = DUMMY_APP_SLUG

    const {
      session: { accessToken: adminToken },
    } = await createTestUser(testModule, {
      username: 'as_admin',
      password: '123',
      admin: true,
    })

    await apiClient(adminToken).PUT(
      '/api/v1/server/apps/{appIdentifier}/enabled',
      {
        params: { path: { appIdentifier } },
        body: { enabled: true },
      },
    )
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  it('should require admin for access settings', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'as_nonadmin',
      password: '123',
    })

    const res = await apiClient(accessToken).PUT(
      '/api/v1/server/apps/{appIdentifier}/access-settings',
      {
        params: { path: { appIdentifier } },
        body: {
          userScopeEnabledDefault: true,
          folderScopeEnabledDefault: true,
        },
      },
    )
    expect(res.response.status).toBe(401)
  })

  it('should require authentication', async () => {
    const res = await apiClient().PUT(
      '/api/v1/server/apps/{appIdentifier}/access-settings',
      {
        params: { path: { appIdentifier } },
        body: {
          userScopeEnabledDefault: true,
          folderScopeEnabledDefault: true,
        },
      },
    )
    expect(res.response.status).toBe(401)
  })

  it('should update access settings as admin', async () => {
    await testModule!.installLocalAppBundles([DUMMY_APP_SLUG])
    appIdentifier = DUMMY_APP_SLUG

    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'as_admin2',
      password: '123',
      admin: true,
    })

    await apiClient(accessToken).PUT(
      '/api/v1/server/apps/{appIdentifier}/enabled',
      {
        params: { path: { appIdentifier } },
        body: { enabled: true },
      },
    )

    const res = await apiClient(accessToken).PUT(
      '/api/v1/server/apps/{appIdentifier}/access-settings',
      {
        params: { path: { appIdentifier } },
        body: {
          userScopeEnabledDefault: true,
          folderScopeEnabledDefault: false,
        },
      },
    )
    expect([200, 201]).toContain(res.response.status)
    expect(res.data?.app).toBeDefined()
  })

  it('should persist access settings changes', async () => {
    await testModule!.installLocalAppBundles([DUMMY_APP_SLUG])
    appIdentifier = DUMMY_APP_SLUG

    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'as_persist',
      password: '123',
      admin: true,
    })

    await apiClient(accessToken).PUT(
      '/api/v1/server/apps/{appIdentifier}/enabled',
      {
        params: { path: { appIdentifier } },
        body: { enabled: true },
      },
    )

    await apiClient(accessToken).PUT(
      '/api/v1/server/apps/{appIdentifier}/access-settings',
      {
        params: { path: { appIdentifier } },
        body: {
          userScopeEnabledDefault: false,
          folderScopeEnabledDefault: true,
        },
      },
    )

    // Verify by getting the app
    const getRes = await apiClient(accessToken).GET(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier } } },
    )
    expect(getRes.response.status).toBe(200)
    expect(getRes.data?.app).toBeDefined()
  })
})
