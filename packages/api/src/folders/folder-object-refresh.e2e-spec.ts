import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { CoreTaskName } from 'src/task/task.constants'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
  reindexTestFolder,
} from 'src/test/test.util'

const TEST_MODULE_KEY = 'folder_obj_ref'

describe('Folder Object Refresh', () => {
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
    const res = await apiClient().POST(
      '/api/v1/folders/{folderId}/objects/{objectKey}/refresh',
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

  it('should refresh an object in owned folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'refreshuser',
      password: '123',
    })

    await testModule!.setServerStorageLocation()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'RefreshFolder',
      mockFiles: [{ objectKey: 'refresh-me.txt', content: 'data' }],
    })

    await reindexTestFolder({ accessToken, apiClient, folderId: folder.id })
    await testModule!.waitForTasks('completed', {
      taskIdentifiers: [CoreTaskName.ReindexFolder],
    })

    const listRes = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      { params: { path: { folderId: folder.id } } },
    )
    expect(listRes.data!.result.length).toBeGreaterThanOrEqual(1)
    const objectKey = listRes.data!.result[0]!.objectKey

    const refreshRes = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{objectKey}/refresh',
      {
        params: {
          path: {
            folderId: folder.id,
            objectKey: encodeURIComponent(objectKey),
          },
        },
      },
    )
    expect([200, 201]).toContain(refreshRes.response.status)
    expect(refreshRes.data).toBeDefined()
  })

  it('should not allow refresh of object in non-owned folder', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'refowner',
      password: '123',
    })

    const {
      session: { accessToken: otherToken },
    } = await createTestUser(testModule!, {
      username: 'refother',
      password: '123',
    })

    await testModule!.setServerStorageLocation()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken: ownerToken,
      apiClient,
      folderName: 'RefProtected',
      mockFiles: [{ objectKey: 'protected.txt', content: 'nope' }],
    })

    const res = await apiClient(otherToken).POST(
      '/api/v1/folders/{folderId}/objects/{objectKey}/refresh',
      {
        params: {
          path: { folderId: folder.id, objectKey: 'protected.txt' },
        },
      },
    )
    expect([401, 403, 404]).toContain(res.response.status)
  })

  it('should return error for non-existent object', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'refmissing',
      password: '123',
    })

    await testModule!.setServerStorageLocation()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'RefMissingFolder',
      mockFiles: [],
    })

    const res = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{objectKey}/refresh',
      {
        params: {
          path: { folderId: folder.id, objectKey: 'nonexistent.txt' },
        },
      },
    )
    expect([404, 400]).toContain(res.response.status)
  })
})
