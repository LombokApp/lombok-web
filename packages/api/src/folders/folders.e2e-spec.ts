import { getQueueToken } from '@nestjs/bullmq'
import type { InMemoryQueue } from 'src/queue/InMemoryQueue'
import { QueueName } from 'src/queue/queue.constants'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  registerTestUser,
  rescanTestFolder,
  testS3Location,
  waitForTrue,
} from 'src/test/test.util'
import { buildSupertestApiClient } from 'src/test/test-api-client'

const TEST_MODULE_KEY = 'folders'

describe('Folders', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
    })
    apiClient = buildSupertestApiClient(testModule)
  })

  afterEach(async () => {
    await testModule?.resetDb()
  })

  it(`should create a folder`, async () => {
    const {
      session: { accessToken },
    } = await registerTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    const bucketName = (await testModule?.initMinioTestBucket([])) ?? ''
    const metadataBucketName = (await testModule?.initMinioTestBucket()) ?? ''

    const createResponse = await apiClient
      .foldersApi({ accessToken })
      .createFolder({
        folderCreateInputDTO: {
          name: 'My test folder',
          contentLocation: testS3Location({ bucketName }),
          metadataLocation: testS3Location({ bucketName: metadataBucketName }),
        },
      })

    expect(createResponse.data.folder.id).toBeTruthy()

    const folderGetResponse = await apiClient
      .foldersApi({ accessToken })
      .getFolder({ folderId: createResponse.data.folder.id })

    expect(folderGetResponse.status).toEqual(200)
    expect(folderGetResponse.data.folder.id).toEqual(
      createResponse.data.folder.id,
    )
  })

  it(`should get a folder by id`, async () => {
    const {
      session: { accessToken },
    } = await registerTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'My Folder',
      apiClient,
      testModule,
      accessToken,
      mockFiles: [],
    })

    expect(testFolder.folder.id).toBeTruthy()

    const folderGetResponse = await apiClient
      .foldersApi({ accessToken })
      .getFolder({ folderId: testFolder.folder.id })

    expect(folderGetResponse.status).toEqual(200)
    expect(folderGetResponse.data.folder.id).toEqual(testFolder.folder.id)
  })

  it(`should list a user's folders`, async () => {
    const {
      session: { accessToken },
    } = await registerTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'My Folder',
      testModule,
      apiClient,
      accessToken,
      mockFiles: [],
    })

    expect(testFolder.folder.id).toBeTruthy()

    const folderListResponse = await apiClient
      .foldersApi({ accessToken })
      .listFolders()

    expect(folderListResponse.status).toEqual(200)
    expect(folderListResponse.data.meta.totalCount).toEqual(1)
    expect(folderListResponse.data.result.length).toEqual(1)
  })

  it(`should delete a folder by id`, async () => {
    const {
      session: { accessToken },
    } = await registerTestUser(testModule, {
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

    const folderGetResponse = await apiClient
      .foldersApi({ accessToken })
      .getFolder({ folderId: testFolder.folder.id })

    expect(folderGetResponse.status).toEqual(200)
    expect(folderGetResponse.data.folder.id).toEqual(testFolder.folder.id)

    const deleteFolderGetResponse = await apiClient
      .foldersApi({ accessToken })
      .deleteFolder({ folderId: testFolder.folder.id })

    expect(deleteFolderGetResponse.status).toEqual(200)

    const secondFolderGetResponse = await apiClient
      .foldersApi({ accessToken })
      .getFolder({ folderId: testFolder.folder.id })

    expect(secondFolderGetResponse.status).toEqual(404)
  })

  it(`should return 401 from get folder by id without token`, async () => {
    const {
      session: { accessToken },
    } = await registerTestUser(testModule, {
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

    const folderGetResponse = await apiClient
      .foldersApi({
        /* accessToken */
      })
      .getFolder({ folderId: testFolder.folder.id })

    expect(folderGetResponse.status).toEqual(401)
  })

  it(`should return 404 from get folder by id with valid token of non-owner user`, async () => {
    const {
      session: { accessToken },
    } = await registerTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    const {
      session: { accessToken: secondUserAccessToken },
    } = await registerTestUser(testModule, {
      username: 'testuser2',
      password: '123',
    })

    const folderCreateResponse = await apiClient
      .foldersApi({ accessToken })
      .createFolder({
        folderCreateInputDTO: {
          name: 'My Folder',
          contentLocation: testS3Location({ bucketName: '__dummy__' }),
          metadataLocation: testS3Location({ bucketName: '__dummy__' }),
        },
      })

    expect(folderCreateResponse.status).toEqual(201)

    const folderGetResponse = await apiClient
      .foldersApi({ accessToken: secondUserAccessToken })
      .getFolder({ folderId: folderCreateResponse.data.folder.id })

    expect(folderGetResponse.status).toEqual(404)
  })

  it(`it should scan the storage location represented by a folder`, async () => {
    const {
      session: { accessToken },
    } = await registerTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    const MOCK_OBJECTS: { objectKey: string; content: string }[] = [
      { content: 'object 1 content', objectKey: 'key1' },
      { content: 'object 2 content', objectKey: 'key2' },
    ]

    const testFolder = await createTestFolder({
      folderName: 'My Folder',
      testModule,
      accessToken,
      mockFiles: MOCK_OBJECTS,
      apiClient,
    })

    expect(testFolder.folder.id).toBeTruthy()

    const folderGetResponse = await apiClient
      .foldersApi({ accessToken })
      .getFolder({ folderId: testFolder.folder.id })

    expect(folderGetResponse.status).toEqual(200)
    expect(folderGetResponse.data.folder.id).toEqual(testFolder.folder.id)

    const queue: InMemoryQueue | undefined = await testModule?.app.resolve(
      getQueueToken(QueueName.RescanFolder),
    )
    const jobsCompletedBefore = queue?.stats.completedJobs ?? 0

    await rescanTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    // wait to see that a job was run (we know it's our job)
    await waitForTrue(
      () => (queue?.stats.completedJobs ?? 0) > jobsCompletedBefore,
      { retryPeriod: 100, maxRetries: 10 },
    )
    const listObjectsResponse = await apiClient
      .foldersApi({ accessToken })
      .listFolderObjects({ folderId: testFolder.folder.id })

    expect(listObjectsResponse.data.result.length).toBeGreaterThan(0)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
