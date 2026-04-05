import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'
import { v4 as uuidV4 } from 'uuid'

const TEST_MODULE_KEY = 'folder_delete'

describe('Folder Delete', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
    testModule?.cleanupMinioTestBuckets()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  it('should require authentication', async () => {
    const res = await apiClient().DELETE('/api/v1/folders/{folderId}', {
      params: {
        path: { folderId: '00000000-0000-0000-0000-000000000000' },
      },
    })
    expect(res.response.status).toBe(401)
  })

  it('should delete an owned folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'delowner',
      password: '123',
    })

    await testModule!.setServerStorageLocation()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'ToDelete',
      mockFiles: [],
    })

    const res = await apiClient(accessToken).DELETE(
      '/api/v1/folders/{folderId}',
      { params: { path: { folderId: folder.id } } },
    )
    expect([200, 204]).toContain(res.response.status)

    // Verify it's gone
    const getRes = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}',
      { params: { path: { folderId: folder.id } } },
    )
    expect([404, 401, 403]).toContain(getRes.response.status)
  })

  it('should not allow non-owner to delete', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'delown2',
      password: '123',
    })

    const {
      session: { accessToken: otherToken },
    } = await createTestUser(testModule!, {
      username: 'delother',
      password: '123',
    })

    await testModule!.setServerStorageLocation()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken: ownerToken,
      apiClient,
      folderName: 'NoDeleteFolder',
      mockFiles: [],
    })

    const res = await apiClient(otherToken).DELETE(
      '/api/v1/folders/{folderId}',
      { params: { path: { folderId: folder.id } } },
    )
    expect([401, 403, 404]).toContain(res.response.status)
  })

  it('should return error for non-existent folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'del404',
      password: '123',
    })

    const res = await apiClient(accessToken).DELETE(
      '/api/v1/folders/{folderId}',
      { params: { path: { folderId: uuidV4() } } },
    )
    expect([404, 400, 401, 403]).toContain(res.response.status)
  })
})
