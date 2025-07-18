import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

const TEST_MODULE_KEY = 'apps'

describe('Apps', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  afterEach(() => testModule?.resetAppState())

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
    expect(listAppsResponse.data.result.length).toEqual(1)
    expect(listAppsResponse.data.result.length).toEqual(
      listAppsResponse.data.meta.totalCount,
    )
  })

  it(`should test error response structure`, async () => {
    // Test a 401 response to see the structure
    const appsListResponse = await apiClient().GET('/api/v1/server/apps')
    expect(appsListResponse.response.status).toBe(401)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
