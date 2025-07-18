import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

import { buildAccessKeyHashId } from './access-key.utils'

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
    await testModule?.resetAppState()
  })

  it(`should list DISTINCT server access keys`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
      admin: true,
    })

    const createProvisionResponse = await apiClient(accessToken).POST(
      '/api/v1/server/user-storage-provisions',
      {
        body: {
          accessKeyId: 'dummyaccesskeyid',
          secretAccessKey: 'dummysecretAccessKey',
          endpoint: 'http://dummyendpoint',
          bucket: 'dummybucket',
          region: 'auto',
          prefix: '',
          label: 'dummylabel',
          description: 'Test',
          provisionTypes: ['CONTENT'],
        },
      },
    )
    if (!createProvisionResponse.data) throw new Error('No data')
    const storageProvisionId = createProvisionResponse.data.result[0].id
    await apiClient(accessToken).POST('/api/v1/folders', {
      body: {
        name: 'Test Folder',
        contentLocation: {
          accessKeyId: 'testaccesskeyid',
          secretAccessKey: 'testsecretaccesskey',
          endpoint: 'http://localhost:9000',
          bucket: 'testbucket',
          region: 'us-east-1',
        },
        metadataLocation: {
          accessKeyId: 'testaccesskeyid',
          secretAccessKey: 'testsecretaccesskey',
          endpoint: 'http://localhost:9000',
          bucket: 'testbucket',
          region: 'us-east-1',
        },
      },
    })

    await apiClient(accessToken).POST('/api/v1/folders', {
      body: {
        name: '__dummyfolder__',
        contentLocation: { storageProvisionId },
        metadataLocation: { storageProvisionId },
      },
    })

    await apiClient(accessToken).POST('/api/v1/folders', {
      body: {
        name: '__dummyfolder2__',
        contentLocation: { storageProvisionId },
        metadataLocation: { storageProvisionId },
      },
    })

    const listServerAccessKeysResponse = await apiClient(accessToken).GET(
      '/api/v1/server/access-keys',
    )
    if (!listServerAccessKeysResponse.data) throw new Error('No data')
    expect(listServerAccessKeysResponse.data.result[0].accessKeyHashId).toEqual(
      buildAccessKeyHashId({
        accessKeyId: 'dummyaccesskeyid',
        secretAccessKey: 'dummysecretAccessKey',
        region: 'auto',
        endpoint: 'http://dummyendpoint',
      }),
    )

    expect(listServerAccessKeysResponse.response.status).toEqual(200)
    expect(listServerAccessKeysResponse.data.result.length).toEqual(1)
    expect(listServerAccessKeysResponse.data.result[0].accessKeyId).toEqual(
      'dummyaccesskeyid',
    )
    expect(listServerAccessKeysResponse.data.result[0].endpointDomain).toEqual(
      'dummyendpoint',
    )
    expect(listServerAccessKeysResponse.data.result[0].folderCount).toEqual(2)
  })

  it(`should 401 on list server access keys without token`, async () => {
    const accessKeysListResponse = await apiClient().GET(
      '/api/v1/server/access-keys',
    )

    expect(accessKeysListResponse.response.status).toEqual(401)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
