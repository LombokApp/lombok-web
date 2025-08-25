import { CORE_APP_IDENTIFIER } from '@lombokapp/types'
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

  beforeEach(() => testModule?.resetAppState())

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

  it(`should generate a valid user app access token`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const appIdentifier = CORE_APP_IDENTIFIER
    const generateTokenResponse = await apiClient(accessToken).POST(
      `/api/v1/server/apps/{appIdentifier}/user-access-token`,
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

    const viewerResponse = await apiClient(
      generateTokenResponse.data.session.accessToken,
    ).GET(`/api/v1/viewer`)
    expect(viewerResponse.response.status).toEqual(200)
    expect(viewerResponse.data?.user.username).toBe('testuser')

    const accessKeysResponse = await apiClient(
      generateTokenResponse.data.session.accessToken,
    ).GET(`/api/v1/access-keys`)
    expect(accessKeysResponse.response.status).toEqual(403)
  })

  it(`should return 404 for non-existent app`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser2',
      password: '123',
    })

    const appIdentifier = 'non-existent-app'
    const generateTokenResponse = await apiClient(accessToken).POST(
      `/api/v1/server/apps/{appIdentifier}/user-access-token`,
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

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
