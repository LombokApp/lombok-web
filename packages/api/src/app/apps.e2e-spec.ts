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

  afterEach(async () => {
    await testModule?.resetDb()
  })

  it(`should list apps`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const listAppsResponse = await apiClient.appsApi({ accessToken }).listApps()

    expect(listAppsResponse.status).toEqual(200)
    expect(listAppsResponse.data.installed.result.length).toEqual(1)
    expect(listAppsResponse.data.installed.result.length).toEqual(
      listAppsResponse.data.installed.meta.totalCount,
    )
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
