import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

const TEST_MODULE_KEY = 'server_storage_location'

describe('Server - Server Storage Location', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  it(`should set a valid server storage location`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const setServerStorageLocationResponse = await apiClient
      .serverStorageLocationApi({ accessToken })
      .setServerStorageLocation({
        serverStorageLocationInputDTO: {
          accessKeyId: 'dummyaccesskeyid',
          secretAccessKey: 'dummysecretAccessKey',
          bucket: 'dummybucket',
          endpoint: 'http://dummyendpoint',
          region: 'auto',
          prefix: null,
        },
      })
    expect(setServerStorageLocationResponse.status).toEqual(201)
    expect(
      setServerStorageLocationResponse.data.serverStorageLocation?.accessKeyId,
    ).toEqual('dummyaccesskeyid')
    expect(
      setServerStorageLocationResponse.data.serverStorageLocation?.bucket,
    ).toEqual('dummybucket')
    expect(
      setServerStorageLocationResponse.data.serverStorageLocation?.endpoint,
    ).toEqual('http://dummyendpoint')
    expect(
      setServerStorageLocationResponse.data.serverStorageLocation?.region,
    ).toEqual('auto')
    expect(
      setServerStorageLocationResponse.data.serverStorageLocation?.prefix,
    ).toEqual(null)
  })

  it(`should fail to set an invalid server storage location [bad endpoint]`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    for (const endpoint of [
      undefined,
      null,
      '',
      '____',
      'http://something.com/a_path',
    ] as string[]) {
      const serverStorageLocation = {
        serverStorageLocationInputDTO: {
          accessKeyId: 'dummyaccesskeyid',
          secretAccessKey: 'dummysecretAccessKey',
          bucket: 'dummybucket',
          endpoint,
          region: 'auto',
          prefix: null,
        },
      }
      const setServerStorageLocationResponse = await apiClient
        .serverStorageLocationApi({ accessToken })
        .setServerStorageLocation(serverStorageLocation)
      expect(setServerStorageLocationResponse.status).toEqual(400)
    }
  })

  it(`should fail to set an invalid server storage location [bad region]`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    for (const region of [undefined, null, ''] as unknown as string[]) {
      const serverStorageLocation = {
        serverStorageLocationInputDTO: {
          accessKeyId: 'dummyaccesskeyid',
          secretAccessKey: 'dummysecretAccessKey',
          bucket: 'dummybucket',
          endpoint: 'http://example-endpoint.com',
          region,
          prefix: '',
        },
      }
      const setServerStorageLocationResponse = await apiClient
        .serverStorageLocationApi({ accessToken })
        .setServerStorageLocation(serverStorageLocation)

      expect(setServerStorageLocationResponse.status).toEqual(400)
    }
  })

  it(`should fail to set an invalid server storage location [bad accessKeyId]`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    for (const accessKeyId of [undefined, null, ''] as unknown as string[]) {
      const serverStorageLocation = {
        serverStorageLocationInputDTO: {
          accessKeyId,
          secretAccessKey: 'dummysecretAccessKey',
          bucket: 'dummybucket',
          endpoint: 'http://example-endpoint.com',
          region: 'auto',
          prefix: '',
        },
      }
      const setServerStorageLocationResponse = await apiClient
        .serverStorageLocationApi({ accessToken })
        .setServerStorageLocation(serverStorageLocation)

      expect(setServerStorageLocationResponse.status).toEqual(400)
    }
  })

  it(`should fail to set an invalid server storage location [bad secretAccessKey]`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    for (const secretAccessKey of [
      undefined,
      null,
      '',
    ] as unknown as string[]) {
      const serverStorageLocation = {
        serverStorageLocationInputDTO: {
          accessKeyId: 'dummAccessKeyId',
          secretAccessKey,
          bucket: 'dummybucket',
          endpoint: 'http://example-endpoint.com',
          region: 'auto',
          prefix: '',
        },
      }
      const setServerStorageLocationResponse = await apiClient
        .serverStorageLocationApi({ accessToken })
        .setServerStorageLocation(serverStorageLocation)

      expect(setServerStorageLocationResponse.status).toEqual(400)
    }
  })

  it(`should fail to set an invalid server storage location [bad prefix]`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    for (const prefix of [undefined, ''] as unknown as string[]) {
      const serverStorageLocation = {
        serverStorageLocationInputDTO: {
          accessKeyId: 'dummAccessKeyId',
          secretAccessKey: 'dummySecretAccessKey',
          bucket: 'dummybucket',
          endpoint: 'http://example-endpoint.com',
          region: 'auto',
          prefix,
        },
      }
      const setServerStorageLocationResponse = await apiClient
        .serverStorageLocationApi({ accessToken })
        .setServerStorageLocation(serverStorageLocation)

      expect(setServerStorageLocationResponse.status).toEqual(400)
    }
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
