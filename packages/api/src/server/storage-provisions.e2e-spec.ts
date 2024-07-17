import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

import { StorageProvisionType } from './constants/server.constants'

const TEST_MODULE_KEY = 'storage_provisions'

describe('Server - Storage Provisions', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetDb()
  })

  it(`should create a storage provision`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const createProvisionResponse = await apiClient
      .storageProvisionsApi({ accessToken })
      .createServerProvision({
        storageProvisionInputDTO: {
          accessKeyId: 'dummyaccesskeyid',
          secretAccessKey: 'dummysecretAccessKey',
          bucket: 'dummybucket',
          description: 'dummydescription',
          endpoint: 'http://dummyendpoint',
          label: 'dummylabel',
          provisionTypes: [StorageProvisionType.BACKUP],
          region: 'auto',
          prefix: '',
        },
      })
    expect(createProvisionResponse.status).toEqual(201)
    expect(createProvisionResponse.data.result[0].accessKeyId).toEqual(
      'dummyaccesskeyid',
    )
  })

  it(`should update a storage provision`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const createProvisionResponse = await apiClient
      .storageProvisionsApi({ accessToken })
      .createServerProvision({
        storageProvisionInputDTO: {
          accessKeyId: 'dummyaccesskeyid',
          secretAccessKey: 'dummysecretAccessKey',
          bucket: 'dummybucket',
          description: 'dummydescription',
          endpoint: 'http://dummyendpoint',
          label: 'dummylabel',
          provisionTypes: [StorageProvisionType.BACKUP],
          region: 'auto',
          prefix: '',
        },
      })
    expect(createProvisionResponse.status).toEqual(201)
    expect(createProvisionResponse.data.result[0].accessKeyId).toEqual(
      'dummyaccesskeyid',
    )

    const updateProvisionResponse = await apiClient
      .storageProvisionsApi({ accessToken })
      .updateStorageProvision({
        storageProvisionId: createProvisionResponse.data.result[0].id,
        storageProvisionInputDTO: {
          accessKeyId: '__dummyaccesskeyid',
          secretAccessKey: '__dummysecretAccessKey',
          bucket: '__dummybucket',
          description: '__dummydescription',
          endpoint: 'http://dummyendpoint__',
          label: '__dummylabel',
          provisionTypes: [
            StorageProvisionType.CONTENT,
            StorageProvisionType.BACKUP,
          ],
          region: '__auto',
          prefix: '__prefix',
        },
      })

    expect(updateProvisionResponse.status).toEqual(200)
    expect(updateProvisionResponse.data.result[0].accessKeyId).toEqual(
      '__dummyaccesskeyid',
    )
    expect(updateProvisionResponse.data.result[0].bucket).toEqual(
      '__dummybucket',
    )
    expect(updateProvisionResponse.data.result[0].description).toEqual(
      '__dummydescription',
    )
    expect(updateProvisionResponse.data.result[0].endpoint).toEqual(
      'http://dummyendpoint__',
    )
    expect(updateProvisionResponse.data.result[0].label).toEqual('__dummylabel')
    expect(updateProvisionResponse.data.result[0].region).toEqual('__auto')
    expect(updateProvisionResponse.data.result[0].prefix).toEqual('__prefix')
  })

  it(`should delete a storage provision`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const createProvisionResponse = await apiClient
      .storageProvisionsApi({ accessToken })
      .createServerProvision({
        storageProvisionInputDTO: {
          accessKeyId: 'dummyaccesskeyid',
          secretAccessKey: 'dummysecretAccessKey',
          bucket: 'dummybucket',
          description: 'dummydescription',
          endpoint: 'http://dummyendpoint',
          label: 'dummylabel',
          provisionTypes: [StorageProvisionType.BACKUP],
          region: 'auto',
          prefix: '',
        },
      })
    expect(createProvisionResponse.status).toEqual(201)
    expect(createProvisionResponse.data.result[0].accessKeyId).toEqual(
      'dummyaccesskeyid',
    )

    const deleteProvisionResponse = await apiClient
      .storageProvisionsApi({ accessToken })
      .deleteStorageProvision({
        storageProvisionId: createProvisionResponse.data.result[0].id,
      })
    expect(deleteProvisionResponse.status).toEqual(200)

    const listProvisionsResponse = await apiClient
      .storageProvisionsApi({ accessToken })
      .listStorageProvisions()

    expect(listProvisionsResponse.status).toEqual(200)
    expect(listProvisionsResponse.data.result.length).toEqual(0)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
