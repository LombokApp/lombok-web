import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'

import { buildAccessKeyHashId } from './access-key.utils'

const TEST_MODULE_KEY = 'access_keys'

describe('Access Keys', () => {
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

  it(`should list DISTINCT user access keys`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'My Folder',
      testModule,
      accessToken,
      mockFiles: [],
      apiClient,
    })

    expect(testFolder.folder.id).toBeTruthy()

    const listAccessKeysResponse = await apiClient(accessToken).GET(
      '/api/v1/access-keys',
      {},
    )
    if (!listAccessKeysResponse.data) {
      throw new Error('No data')
    }

    expect(listAccessKeysResponse.response.status).toEqual(200)
    expect(listAccessKeysResponse.data.result.length).toEqual(1)
    expect(listAccessKeysResponse.data.result[0]?.accessKeyHashId).toEqual(
      buildAccessKeyHashId({
        accessKeyId: 'lomboktestadmin',
        secretAccessKey: 'lomboktestadmin',
        region: 'auto',
        endpoint: 'http://127.0.0.1:9000',
      }),
    )
    expect(listAccessKeysResponse.data.result[0]?.accessKeyId).toEqual(
      'lomboktestadmin',
    )
    expect(listAccessKeysResponse.data.result[0]?.endpointDomain).toEqual(
      '127.0.0.1:9000',
    )
    expect(listAccessKeysResponse.data.result[0]?.folderCount).toEqual(1)
  })

  it(`should 401 on list access keys without token`, async () => {
    const listAccessKeysResponse = await apiClient().GET('/api/v1/access-keys')

    expect(listAccessKeysResponse.response.status).toEqual(401)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
