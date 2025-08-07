import { PlatformTaskService } from 'src/task/services/platform-task.service'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
  reindexTestFolder,
  waitForTrue,
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
      '/api/v1/folders/{folderId}/objects/{objectKey}',
      {
        params: { path: { folderId: '__dummy__', objectKey: '__dummy__' } },
      },
    )

    expect(response.status).toBe(401)
  })

  // it(`should get a folder object by folderId and objectKey`, async () => {
  //   const {
  //     session: { accessToken },
  //   } = await createTestUser(testModule, {
  //     username: 'testuser',
  //     password: '123',
  //     email: 'test@example.com',
  //   })

  //   const MOCK_OBJECTS: { objectKey: string; content: string }[] = [
  //     { content: 'object 1 content', objectKey: 'key1' },
  //     { content: 'object 2 content', objectKey: 'key2' },
  //     { content: 'object 3 content', objectKey: 'key3' },
  //     { content: 'object 4 content', objectKey: 'key4' },
  //     { content: 'object 5 content', objectKey: 'key5' },
  //   ]

  //   const testFolder = await createTestFolder({
  //     folderName: 'My Folder',
  //     testModule,
  //     accessToken,
  //     mockFiles: MOCK_OBJECTS,
  //     apiClient,
  //   })

  //   expect(testFolder.folder.id).toBeTruthy()
  //   const queue: InMemoryQueue | undefined = await testModule?.app.resolve(
  //     getQueueToken(PlatformTaskName.REINDEX_FOLDER),
  //   )

  //   const jobsCompletedBefore = queue?.stats.completedJobs ?? 0

  //   await reindexTestFolder({
  //     accessToken,
  //     apiClient,
  //     folderId: testFolder.folder.id,
  //   })

  //   await waitForTrue(
  //     () => (queue?.stats.completedJobs ?? 0) > jobsCompletedBefore,
  //     { retryPeriod: 100, maxRetries: 10 },
  //   )

  //   const folderObjectGetResponse = await apiClient(accessToken).GET('/api/v1/folders/{folderId}/objects/{objectKey}', {
  //     params: { path: { folderId: testFolder.folder.id, objectKey: 'key3' } },
  //   })

  //   // console.log('folderObjectGetResponse.body:', folderObjectGetResponse.body)
  //   if (!folderObjectGetResponse.data) {
  //     throw new Error('No response data received')
  //   }
  //   expect(folderObjectGetResponse.data.folderObject.objectKey).toEqual('key3')
  //   expect(folderObjectGetResponse.data.folderObject.sizeBytes).toEqual(16)
  // })

  // it(`it should list objects in a folder`, async () => {
  //   const {
  //     session: { accessToken },
  //   } = await createTestUser(testModule, {
  //     username: 'testuser',
  //     password: '123',
  //   })

  //   const MOCK_OBJECTS: { objectKey: string; content: string }[] = [
  //     { content: 'object 1 content', objectKey: 'key1' },
  //     { content: 'object 2 content', objectKey: 'key2' },
  //     { content: 'object 3 content', objectKey: 'key3' },
  //     { content: 'object 4 content', objectKey: 'key4' },
  //     { content: 'object 5 content', objectKey: 'key5' },
  //   ]

  //   const testFolder = await createTestFolder({
  //     folderName: 'My Folder',
  //     testModule,
  //     accessToken,
  //     mockFiles: MOCK_OBJECTS,
  //     apiClient,
  //   })

  //   expect(testFolder.folder.id).toBeTruthy()

  //   const folderGetResponse = await apiClient(accessToken).GET('/api/v1/folders/{folderId}', {
  //     params: { path: { folderId: testFolder.folder.id } },
  //   })

  //   if (!folderGetResponse.data) {
  //     throw new Error('No response data received')
  //   }
  //   expect(folderGetResponse.data.folder.id).toEqual(testFolder.folder.id)

  //   const queue: InMemoryQueue | undefined = await testModule?.app.resolve(
  //     getQueueToken(PlatformTaskName.REINDEX_FOLDER),
  //   )
  //   const jobsCompletedBefore = queue?.stats.completedJobs ?? 0

  //   await reindexTestFolder({
  //     accessToken,
  //     apiClient,
  //     folderId: testFolder.folder.id,
  //   })

  //   await waitForTrue(
  //     () => (queue?.stats.completedJobs ?? 0) > jobsCompletedBefore,
  //     { retryPeriod: 100, maxRetries: 10 },
  //   )

  //   const listObjectsResponse = await apiClient(accessToken).GET('/api/v1/folders/{folderId}/objects', {
  //     params: { path: { folderId: testFolder.folder.id } },
  //   })

  //   if (!listObjectsResponse.data) {
  //     throw new Error('No response data received')
  //   }
  //   expect(listObjectsResponse.data.result.length).toBe(5)
  // })

  // it(`it should delete an object from a folder`, async () => {
  //   const {
  //     session: { accessToken },
  //   } = await createTestUser(testModule, {
  //     username: 'testuser',
  //     password: '123',
  //   })

  //   const MOCK_OBJECTS: { objectKey: string; content: string }[] = [
  //     { content: 'object 1 content', objectKey: 'key1' },
  //   ]

  //   const testFolder = await createTestFolder({
  //     folderName: 'My Folder',
  //     testModule,
  //     accessToken,
  //     mockFiles: MOCK_OBJECTS,
  //     apiClient,
  //   })

  //   expect(testFolder.folder.id).toBeTruthy()

  //   const folderGetResponse = await apiClient(accessToken).GET('/api/v1/folders/{folderId}', {
  //     params: { path: { folderId: testFolder.folder.id } },
  //   })

  //   if (!folderGetResponse.data) {
  //     throw new Error('No response data received')
  //   }
  //   expect(folderGetResponse.data.folder.id).toEqual(testFolder.folder.id)

  //   const queue: InMemoryQueue | undefined = await testModule?.app.resolve(
  //     getQueueToken(PlatformTaskName.REINDEX_FOLDER),
  //   )
  //   const jobsCompletedBefore = queue?.stats.completedJobs ?? 0

  //   await reindexTestFolder({
  //     accessToken,
  //     apiClient,
  //     folderId: testFolder.folder.id,
  //   })

  //   await waitForTrue(
  //     () => (queue?.stats.completedJobs ?? 0) > jobsCompletedBefore,
  //     { retryPeriod: 100, maxRetries: 10 },
  //   )

  //   const deleteObjectResponse = await apiClient(accessToken).DELETE('/api/v1/folders/{folderId}/objects/{objectKey}', {
  //     params: { path: { folderId: testFolder.folder.id, objectKey: 'key1' } },
  //   })

  //   expect(deleteObjectResponse.data).toBeDefined()

  //   const listObjectsResponse = await apiClient(accessToken).GET('/api/v1/folders/{folderId}/objects', {
  //     params: { path: { folderId: testFolder.folder.id } },
  //   })

  //   if (!listObjectsResponse.data) {
  //     throw new Error('No response data received')
  //   }
  //   expect(listObjectsResponse.data.meta.totalCount).toBe(0)
  //   expect(listObjectsResponse.data.result.length).toBe(0)
  // })

  it(`should update existing objects, not duplicate`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser-reindex',
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
    const platformTaskService =
      await testModule?.app.resolve(PlatformTaskService)

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await waitForTrue(() => platformTaskService?.runningTasksCount === 0, {
      retryPeriod: 100,
      maxRetries: 10,
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
      '/api/v1/folders/{folderId}/objects/{objectKey}',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            objectKey: initialListObjectsResponse.data.result[0].objectKey,
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
