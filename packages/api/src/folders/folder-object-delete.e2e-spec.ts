import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { CoreTaskName } from 'src/task/task.constants'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
  reindexTestFolder,
} from 'src/test/test.util'

const TEST_MODULE_KEY = 'folder_obj_del'

describe('Folder Object Delete', () => {
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
    const res = await apiClient().DELETE(
      '/api/v1/folders/{folderId}/objects/{objectKey}',
      {
        params: {
          path: {
            folderId: '00000000-0000-0000-0000-000000000000',
            objectKey: 'test.txt',
          },
        },
      },
    )
    expect(res.response.status).toBe(401)
  })

  it('should delete an object from owned folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'delobj',
      password: '123',
    })

    await testModule!.setServerStorageLocation()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'DelObjFolder',
      mockFiles: [{ objectKey: 'deleteme.txt', content: 'bye' }],
    })

    await reindexTestFolder({ accessToken, apiClient, folderId: folder.id })
    await testModule!.waitForTasks('completed', {
      taskIdentifiers: [CoreTaskName.ReindexFolder],
    })

    const listBefore = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      { params: { path: { folderId: folder.id } } },
    )
    expect(listBefore.data!.result.length).toBeGreaterThanOrEqual(1)
    const objectKey = listBefore.data!.result[0]!.objectKey

    const deleteRes = await apiClient(accessToken).DELETE(
      '/api/v1/folders/{folderId}/objects/{objectKey}',
      {
        params: {
          path: {
            folderId: folder.id,
            objectKey: encodeURIComponent(objectKey),
          },
        },
      },
    )
    expect(deleteRes.response.status).toBe(200)
  })

  it('should not allow deleting objects from another user folder', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'objowner',
      password: '123',
    })

    const {
      session: { accessToken: otherToken },
    } = await createTestUser(testModule!, {
      username: 'objother',
      password: '123',
    })

    await testModule!.setServerStorageLocation()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken: ownerToken,
      apiClient,
      folderName: 'ProtectedFolder',
      mockFiles: [{ objectKey: 'protected.txt', content: 'nope' }],
    })

    await reindexTestFolder({
      accessToken: ownerToken,
      apiClient,
      folderId: folder.id,
    })
    await testModule!.waitForTasks('completed', {
      taskIdentifiers: [CoreTaskName.ReindexFolder],
    })

    const listRes = await apiClient(ownerToken).GET(
      '/api/v1/folders/{folderId}/objects',
      { params: { path: { folderId: folder.id } } },
    )
    const objectKey = listRes.data?.result[0]?.objectKey ?? 'protected.txt'

    const deleteRes = await apiClient(otherToken).DELETE(
      '/api/v1/folders/{folderId}/objects/{objectKey}',
      {
        params: {
          path: {
            folderId: folder.id,
            objectKey: encodeURIComponent(objectKey),
          },
        },
      },
    )
    expect([401, 403, 404]).toContain(deleteRes.response.status)
  })

  it('should return error for non-existent object', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'delmissing',
      password: '123',
    })

    await testModule!.setServerStorageLocation()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'MissingObjFolder',
      mockFiles: [],
    })

    const res = await apiClient(accessToken).DELETE(
      '/api/v1/folders/{folderId}/objects/{objectKey}',
      {
        params: {
          path: { folderId: folder.id, objectKey: 'nonexistent.txt' },
        },
      },
    )
    expect([404, 400]).toContain(res.response.status)
  })
})
