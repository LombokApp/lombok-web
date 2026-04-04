import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { DUMMY_APP_SLUG } from 'test/e2e.contants'

const TEST_MODULE_KEY = 'app_uninstall'

describe('App Uninstall', () => {
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

  it('should require authentication for uninstall', async () => {
    const res = await apiClient().DELETE(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier: 'fake-app' } } },
    )
    expect(res.response.status).toBe(401)
  })

  it('should require admin for uninstall', async () => {
    await testModule!.installLocalAppBundles([DUMMY_APP_SLUG])
    const appIdentifier = DUMMY_APP_SLUG

    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'uninst_user',
      password: '123',
    })

    const res = await apiClient(accessToken).DELETE(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier } } },
    )
    expect(res.response.status).toBe(401)
  })

  it('should return 404 for non-existent app', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'uninst_404',
      password: '123',
      admin: true,
    })

    const res = await apiClient(accessToken).DELETE(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier: 'nonexistent-app-id' } } },
    )
    expect(res.response.status).toBe(404)
  })

  it('should uninstall an app as admin', async () => {
    await testModule!.installLocalAppBundles([DUMMY_APP_SLUG])
    const appIdentifier = DUMMY_APP_SLUG

    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'uninst_admin',
      password: '123',
      admin: true,
    })

    // Enable first
    await apiClient(accessToken).PUT(
      '/api/v1/server/apps/{appIdentifier}/enabled',
      {
        params: { path: { appIdentifier } },
        body: { enabled: true },
      },
    )

    // Uninstall
    const res = await apiClient(accessToken).DELETE(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier } } },
    )
    expect([200, 204]).toContain(res.response.status)

    // Verify app is gone
    const getRes = await apiClient(accessToken).GET(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier } } },
    )
    expect(getRes.response.status).toBe(404)
  })
})
