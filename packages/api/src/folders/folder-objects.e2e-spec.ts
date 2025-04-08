import { CoreTaskService } from 'src/task/services/core-task.service'
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
    const response = await apiClient
      .foldersApi()
      .listFolderObjects({ folderId: '__dummy__' })

    expect(response.status).toEqual(401)
  })

  it(`should 401 on get folder object without token`, async () => {
    const response = await apiClient
      .foldersApi()
      .getFolderObject({ folderId: '__dummy__', objectKey: '__dummy__' })

    expect(response.status).toEqual(401)
  })

  it(`should 401 on delete folder object without token`, async () => {
    const response = await apiClient
      .foldersApi()
      .deleteFolderObject({ folderId: '__dummy__', objectKey: '__dummy__' })

    expect(response.status).toEqual(401)
  })

  it(`should 401 on refresh folder object S3 metadata without token`, async () => {
    const response = await apiClient
      .foldersApi()
      .refreshFolderObjectS3Metadata({
        folderId: '__dummy__',
        objectKey: '__dummy__',
      })

    expect(response.status).toEqual(401)
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
  //     getQueueToken(CoreTaskName.REINDEX_FOLDER),
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

  //   const folderObjectGetResponse = await apiClient
  //     .foldersApi({ accessToken })
  //     .getFolderObject({ folderId: testFolder.folder.id, objectKey: 'key3' })

  //   // console.log('folderObjectGetResponse.body:', folderObjectGetResponse.body)
  //   expect(folderObjectGetResponse.status).toEqual(200)
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

  //   const folderGetResponse = await apiClient
  //     .foldersApi({ accessToken })
  //     .getFolder({ folderId: testFolder.folder.id })

  //   expect(folderGetResponse.status).toEqual(200)
  //   expect(folderGetResponse.data.folder.id).toEqual(testFolder.folder.id)

  //   const queue: InMemoryQueue | undefined = await testModule?.app.resolve(
  //     getQueueToken(CoreTaskName.REINDEX_FOLDER),
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

  //   const listObjectsResponse = await apiClient
  //     .foldersApi({ accessToken })
  //     .listFolderObjects({ folderId: testFolder.folder.id })

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

  //   const folderGetResponse = await apiClient
  //     .foldersApi({ accessToken })
  //     .getFolder({ folderId: testFolder.folder.id })

  //   expect(folderGetResponse.status).toEqual(200)
  //   expect(folderGetResponse.data.folder.id).toEqual(testFolder.folder.id)

  //   const queue: InMemoryQueue | undefined = await testModule?.app.resolve(
  //     getQueueToken(CoreTaskName.REINDEX_FOLDER),
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

  //   const deleteObjectResponse = await apiClient
  //     .foldersApi({ accessToken })
  //     .deleteFolderObject({ folderId: testFolder.folder.id, objectKey: 'key1' })

  //   expect(deleteObjectResponse.status).toBe(200)

  //   const listObjectsResponse = await apiClient
  //     .foldersApi({ accessToken })
  //     .listFolderObjects({ folderId: testFolder.folder.id })

  //   expect(listObjectsResponse.status).toBe(200)
  //   expect(listObjectsResponse.data.meta.totalCount).toBe(0)
  //   expect(listObjectsResponse.data.result.length).toBe(0)
  // })

  it(`should update existing objects, not duplicate`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
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
    const coreTaskService = await testModule?.app.resolve(CoreTaskService)

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await waitForTrue(() => coreTaskService?.runningTasksCount === 0, {
      retryPeriod: 100,
      maxRetries: 10,
    })

    // Check initial state
    const initialListObjectsResponse = await apiClient
      .foldersApi({ accessToken })
      .listFolderObjects({ folderId: testFolder.folder.id })

    expect(initialListObjectsResponse.status).toBe(200)
    expect(initialListObjectsResponse.data.meta.totalCount).toBe(1)

    await apiClient.foldersApi({ accessToken }).refreshFolderObjectS3Metadata({
      folderId: testFolder.folder.id,
      objectKey: initialListObjectsResponse.data.result[0].objectKey,
    })

    // Check state after object update
    const afterListObjectsResponse = await apiClient
      .foldersApi({ accessToken })
      .listFolderObjects({ folderId: testFolder.folder.id })

    // Total count should still be 1 (no duplicates)
    expect(afterListObjectsResponse.status).toBe(200)
    expect(afterListObjectsResponse.data.meta.totalCount).toBe(1)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
