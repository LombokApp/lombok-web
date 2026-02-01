import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { CoreTaskName } from 'src/task/task.constants'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
  reindexTestFolder,
} from 'src/test/test.util'

const TEST_MODULE_KEY = 'folder_objects'

describe('Folder Objects', () => {
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
    testModule?.cleanupMinioTestBuckets()
  })

  it(`should 401 on list folder objects without token`, async () => {
    const response = await apiClient().GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: '__dummy__' } },
      },
    )

    expect(response.error).toBeDefined()
    expect(response.response.status).toBe(401)
  })

  it(`should 401 on get folder object without token`, async () => {
    const response = await apiClient().GET(
      '/api/v1/folders/{folderId}/objects/{objectKey}',
      {
        params: { path: { folderId: '__dummy__', objectKey: '__dummy__' } },
      },
    )

    expect(response.error).toBeDefined()
    expect(response.response.status).toBe(401)
  })

  it(`should 401 on delete folder object without token`, async () => {
    const response = await apiClient().DELETE(
      '/api/v1/folders/{folderId}/objects/{objectKey}',
      {
        params: { path: { folderId: '__dummy__', objectKey: '__dummy__' } },
      },
    )

    expect(response.response.status).toBe(401)
  })

  it(`should 401 on refresh folder object S3 metadata without token`, async () => {
    const { response } = await apiClient().POST(
      '/api/v1/folders/{folderId}/objects/{objectKey}/refresh',
      {
        params: { path: { folderId: '__dummy__', objectKey: '__dummy__' } },
      },
    )

    expect(response.status).toBe(401)
  })

  it(`should update existing objects, not duplicate`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const MOCK_OBJECTS: { objectKey: string; content: string }[] = [
      { content: 'object 1 content', objectKey: 'key1' },
    ]

    const testFolder = await createTestFolder({
      folderName: 'Reindex Test Folder',
      testModule,
      accessToken,
      mockFiles: MOCK_OBJECTS,
      apiClient,
    })

    expect(testFolder.folder.id).toBeTruthy()

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed', {
      taskIdentifiers: [CoreTaskName.ReindexFolder],
    })

    // Check initial state
    const initialListObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!initialListObjectsResponse.data) {
      throw new Error('No response data received')
    }
    expect(initialListObjectsResponse.data.meta.totalCount).toBe(1)

    await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{objectKey}/refresh',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            objectKey:
              initialListObjectsResponse.data.result[0]?.objectKey ?? '',
          },
        },
      },
    )

    // Check state after object update
    const afterListObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    // Total count should still be 1 (no duplicates)
    if (!afterListObjectsResponse.data) {
      throw new Error('No response data received')
    }
    expect(afterListObjectsResponse.data.meta.totalCount).toBe(1)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
