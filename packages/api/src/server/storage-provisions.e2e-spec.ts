import { StorageProvisionTypeEnum } from '@stellariscloud/types'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

const TEST_MODULE_KEY = 'storage_provisions'

describe('Server - Storage Provisions', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  it(`should create a storage provision`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const createProvisionResponse = await apiClient(accessToken).POST(
      '/api/v1/server/storage-provisions',
      {
        body: {
          accessKeyId: 'dummyaccesskeyid',
          secretAccessKey: 'dummysecretAccessKey',
          bucket: 'dummybucket',
          description: 'dummydescription',
          endpoint: 'http://dummyendpoint',
          label: 'dummylabel',
          provisionTypes: [StorageProvisionTypeEnum.REDUNDANCY],
          region: 'auto',
          prefix: '',
        },
      },
    )
    expect(createProvisionResponse.response.status).toEqual(201)
    if (!createProvisionResponse.data) {
      throw new Error('No data')
    }
    expect(createProvisionResponse.data.result[0].accessKeyId).toEqual(
      'dummyaccesskeyid',
    )
  })

  it(`should update a storage provision location`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const createProvisionResponse = await apiClient(accessToken).POST(
      '/api/v1/server/storage-provisions',
      {
        body: {
          accessKeyId: 'dummyaccesskeyid',
          secretAccessKey: 'dummysecretAccessKey',
          bucket: 'dummybucket',
          description: 'dummydescription',
          endpoint: 'http://dummyendpoint',
          label: 'dummylabel',
          provisionTypes: [StorageProvisionTypeEnum.REDUNDANCY],
          region: 'auto',
          prefix: '',
        },
      },
    )
    expect(createProvisionResponse.response.status).toEqual(201)
    if (!createProvisionResponse.data) {
      throw new Error('No data')
    }
    expect(createProvisionResponse.data.result[0].accessKeyId).toEqual(
      'dummyaccesskeyid',
    )

    const provisionId = createProvisionResponse.data.result[0].id
    if (!provisionId) {
      throw new Error('No provision id')
    }
    const updateProvisionResponse = await apiClient(accessToken).PUT(
      '/api/v1/server/storage-provisions/{storageProvisionId}',
      {
        params: { path: { storageProvisionId: provisionId } },
        body: {
          accessKeyId: 'dummyaccesskeyid',
          secretAccessKey: '__dummysecretAccessKey',
          bucket: 'dummybucket',
          description: 'dummydescription',
          endpoint: 'http://dummyendpoint',
          label: 'dummylabel',
          provisionTypes: [
            StorageProvisionTypeEnum.CONTENT,
            StorageProvisionTypeEnum.REDUNDANCY,
          ],
          region: 'auto',
          prefix: 'prefix',
        },
      },
    )

    expect(updateProvisionResponse.response.status).toEqual(200)
    if (!updateProvisionResponse.data) {
      throw new Error('No data')
    }
    expect(updateProvisionResponse.data.result[0].accessKeyId).toEqual(
      'dummyaccesskeyid',
    )
    expect(updateProvisionResponse.data.result[0].endpoint).toEqual(
      'http://dummyendpoint',
    )
    expect(updateProvisionResponse.data.result[0].bucket).toEqual('dummybucket')
    expect(updateProvisionResponse.data.result[0].region).toEqual('auto')
    expect(updateProvisionResponse.data.result[0].prefix).toEqual('prefix')
    expect(updateProvisionResponse.data.result[0].label).toEqual('dummylabel')
    expect(updateProvisionResponse.data.result[0].description).toEqual(
      'dummydescription',
    )
    expect(updateProvisionResponse.data.result[0].provisionTypes).toEqual([
      StorageProvisionTypeEnum.CONTENT,
      StorageProvisionTypeEnum.REDUNDANCY,
    ])
  })

  it(`should delete a storage provision`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const createProvisionResponse = await apiClient(accessToken).POST(
      '/api/v1/server/storage-provisions',
      {
        body: {
          accessKeyId: 'dummyaccesskeyid',
          secretAccessKey: 'dummysecretAccessKey',
          bucket: 'dummybucket',
          description: 'dummydescription',
          endpoint: 'http://dummyendpoint',
          label: 'dummylabel',
          provisionTypes: [StorageProvisionTypeEnum.REDUNDANCY],
          region: 'auto',
          prefix: '',
        },
      },
    )
    expect(createProvisionResponse.response.status).toEqual(201)
    if (!createProvisionResponse.data) {
      throw new Error('No data')
    }
    expect(createProvisionResponse.data.result[0].accessKeyId).toEqual(
      'dummyaccesskeyid',
    )

    const provisionId = createProvisionResponse.data.result[0].id
    if (!provisionId) {
      throw new Error('No provision id')
    }
    const deleteProvisionResponse = await apiClient(accessToken).DELETE(
      '/api/v1/server/storage-provisions/{storageProvisionId}',
      { params: { path: { storageProvisionId: provisionId } } },
    )
    expect(deleteProvisionResponse.response.status).toEqual(200)

    const listProvisionsResponse = await apiClient(accessToken).GET(
      '/api/v1/server/storage-provisions',
      {},
    )

    expect(listProvisionsResponse.response.status).toEqual(200)
    if (!listProvisionsResponse.data) {
      throw new Error('No data')
    }
    expect(listProvisionsResponse.data.result.length).toEqual(0)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
