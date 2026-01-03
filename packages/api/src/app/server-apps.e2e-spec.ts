import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { DUMMY_APP_SLUG } from 'test/e2e.contants'

const TEST_MODULE_KEY = 'server_apps'

describe('Server Apps', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient
  let appsCount = 0

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
    })
    apiClient = testModule.apiClient
    const apps =
      await testModule.services.ormService.db.query.appsTable.findMany()
    appsCount = apps.length
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  it(`should list apps`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const listAppsResponse = await apiClient(accessToken).GET(
      '/api/v1/server/apps',
    )

    expect(listAppsResponse.response.status).toEqual(200)
    expect(listAppsResponse.data).toBeDefined()
    if (!listAppsResponse.data) {
      throw new Error('No response data received')
    }
    expect(listAppsResponse.data.result.length).toEqual(appsCount)
    expect(listAppsResponse.data.result.length).toEqual(
      listAppsResponse.data.meta.totalCount,
    )
  })

  it(`should test error response structure`, async () => {
    // Test a 401 response to see the structure
    const appsListResponse = await apiClient().GET('/api/v1/server/apps')
    expect(appsListResponse.response.status).toBe(401)
  })

  it(`should require admin to list apps`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'nonadmin',
      password: '123',
      admin: false,
    })

    const listAppsResponse = await apiClient(accessToken).GET(
      '/api/v1/server/apps',
    )
    expect(listAppsResponse.response.status).toBe(401)
  })

  it(`should get app as admin`, async () => {
    await testModule!.installLocalAppBundles([DUMMY_APP_SLUG])
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'adminuser',
      password: '123',
      admin: true,
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
    const getAppResponse = await apiClient(accessToken).GET(
      `/api/v1/server/apps/{appIdentifier}`,
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
    // Admin app DTO should have admin-only fields
    expect(getAppResponse.data.app.publicKey).toBeDefined()
    expect(getAppResponse.data.app.connectedWorkers).toBeDefined()
    expect(getAppResponse.data.app.metrics).toBeDefined()
    expect(getAppResponse.data.app.requiresStorage).toBeDefined()
  })

  it(`should enable and disable app as admin`, async () => {
    await testModule!.installLocalAppBundles([DUMMY_APP_SLUG])
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'adminuser2',
      password: '123',
      admin: true,
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)

    // Enable app
    const enableResponse = await apiClient(accessToken).PUT(
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

    // Disable app
    const disableResponse = await apiClient(accessToken).PUT(
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

    expect(disableResponse.response.status).toEqual(200)
    expect(disableResponse.data?.app.enabled).toBe(false)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
