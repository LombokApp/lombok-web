import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

const TEST_MODULE_KEY = 'server_access_keys'

describe('Server Access Keys', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
    })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetDb()
  })

  it(`should list DISTINCT server access keys`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'testuser',
      password: '123',
      admin: true,
    })

    const createStorageProvisionResponse = await apiClient
      .storageProvisionsApi({ accessToken })
      .createServerProvision({
        storageProvisionInputDTO: {
          accessKeyId: '__dummyak__',
          secretAccessKey: '__dummysecret__',
          endpoint: 'http://dummyendpoint.com',
          bucket: '__dummybucket__',
          description: '__dummydescription__',
          label: '__dummylabel__',
          provisionTypes: ['CONTENT', 'METADATA'],
          region: '__dummyregion__',
          prefix: '__dummyprefix__',
        },
      })
    const storageProvisionId = createStorageProvisionResponse.data.result[0].id
    await apiClient.foldersApi({ accessToken }).createFolder({
      folderCreateInputDTO: {
        name: '__dummyfolder__',
        contentLocation: { storageProvisionId },
        metadataLocation: { storageProvisionId },
      },
    })

    await apiClient.foldersApi({ accessToken }).createFolder({
      folderCreateInputDTO: {
        name: '__dummyfolder2__',
        contentLocation: { storageProvisionId },
        metadataLocation: { storageProvisionId },
      },
    })

    const serverAccessKeysListResponse = await apiClient
      .serverAccessKeysApi({ accessToken })
      .listServerAccessKeys()

    expect(serverAccessKeysListResponse.status).toEqual(200)
    expect(serverAccessKeysListResponse.data.result.length).toEqual(1)
    expect(serverAccessKeysListResponse.data.result[0].accessKeyId).toEqual(
      '__dummyak__',
    )
    expect(serverAccessKeysListResponse.data.result[0].endpointDomain).toEqual(
      'dummyendpoint.com',
    )
    expect(serverAccessKeysListResponse.data.result[0].folderCount).toEqual(2)
  })

  it(`should 401 on list server access keys without token`, async () => {
    const accessKeysListResponse = await apiClient
      .serverAccessKeysApi()
      .listServerAccessKeys()

    expect(accessKeysListResponse.status).toEqual(401)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
