import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { DUMMY_APP_SLUG } from 'test/e2e.contants'

const TEST_MODULE_KEY = 'app_wkr_env'

describe('App Worker Environment Variables', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient
  let appIdentifier: string

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

  async function setupApp(adminToken: string) {
    await testModule!.installLocalAppBundles([DUMMY_APP_SLUG])
    appIdentifier = DUMMY_APP_SLUG

    await apiClient(adminToken).PUT(
      '/api/v1/server/apps/{appIdentifier}/enabled',
      {
        params: { path: { appIdentifier } },
        body: { enabled: true },
      },
    )

    // Get the app to find a worker identifier
    const appRes = await apiClient(adminToken).GET(
      '/api/v1/server/apps/{appIdentifier}',
      { params: { path: { appIdentifier } } },
    )
    return appRes.data!.app
  }

  it('should require authentication', async () => {
    const res = await apiClient().PUT(
      '/api/v1/server/apps/{appIdentifier}/workers/{workerIdentifier}/environment-variables',
      {
        params: {
          path: {
            appIdentifier: 'fake',
            workerIdentifier: 'fake',
          },
        },
        body: { environmentVariables: {} },
      },
    )
    expect(res.response.status).toBe(401)
  })

  it('should require admin', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'envnonadm',
      password: '123',
    })

    const res = await apiClient(accessToken).PUT(
      '/api/v1/server/apps/{appIdentifier}/workers/{workerIdentifier}/environment-variables',
      {
        params: {
          path: {
            appIdentifier: 'fake',
            workerIdentifier: 'fake',
          },
        },
        body: { environmentVariables: {} },
      },
    )
    expect(res.response.status).toBe(401)
  })

  it('should set environment variables for a worker', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'envadmin',
      password: '123',
      admin: true,
    })

    const app = await setupApp(accessToken)
    const workerIds = Object.keys(app.runtimeWorkers.definitions)

    // Skip if dummy app has no workers
    if (workerIds.length === 0) {
      return
    }

    const workerIdentifier = workerIds[0]!

    const res = await apiClient(accessToken).PUT(
      '/api/v1/server/apps/{appIdentifier}/workers/{workerIdentifier}/environment-variables',
      {
        params: {
          path: { appIdentifier, workerIdentifier },
        },
        body: {
          environmentVariables: {
            MY_VAR: 'hello',
            ANOTHER_VAR: 'world',
          },
        },
      },
    )
    expect([200, 201]).toContain(res.response.status)
  })

  it('should return error for non-existent worker', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'envbadwkr',
      password: '123',
      admin: true,
    })

    await setupApp(accessToken)

    const res = await apiClient(accessToken).PUT(
      '/api/v1/server/apps/{appIdentifier}/workers/{workerIdentifier}/environment-variables',
      {
        params: {
          path: {
            appIdentifier,
            workerIdentifier: 'nonexistent-worker',
          },
        },
        body: { environmentVariables: { KEY: 'val' } },
      },
    )
    expect([400, 404]).toContain(res.response.status)
  })
})
