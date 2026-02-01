import { StorageProvisionTypeEnum } from '@lombokapp/types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { CoreTaskName } from 'src/task/task.constants'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
  reindexTestFolder,
  testS3Location,
} from 'src/test/test.util'

const TEST_MODULE_KEY = 'folders'

describe('Folders', () => {
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

  it(`should create a folder`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const bucketName = await testModule!.initMinioTestBucket([])
    const metadataBucketName = await testModule!.initMinioTestBucket()

    const createFolderResponse = await apiClient(accessToken).POST(
      '/api/v1/folders',
      {
        body: {
          name: 'My test folder',
          contentLocation: testS3Location({ bucketName }),
          metadataLocation: testS3Location({ bucketName: metadataBucketName }),
        },
      },
    )
    expect(createFolderResponse.response.status).toEqual(201)
    if (!createFolderResponse.data?.folder.id) {
      throw new Error('No folder id')
    }

    const folderGetResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}',
      { params: { path: { folderId: createFolderResponse.data.folder.id } } },
    )
    expect(folderGetResponse.response.status).toEqual(200)
    expect(folderGetResponse.data?.folder.id).toEqual(
      createFolderResponse.data.folder.id,
    )
  })

  it(`should get a folder by id`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
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

    const folderGetResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}',
      { params: { path: { folderId: testFolder.folder.id } } },
    )
    expect(folderGetResponse.response.status).toEqual(200)
    expect(folderGetResponse.data?.folder.id).toEqual(testFolder.folder.id)
  })

  it(`should update a folder name`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Original Folder Name',
      apiClient,
      testModule,
      accessToken,
      mockFiles: [],
    })

    expect(testFolder.folder.id).toBeTruthy()
    expect(testFolder.folder.name).toEqual('Original Folder Name')

    const updatedName = 'Updated Folder Name'

    const updateFolderResponse = await apiClient(accessToken).PUT(
      '/api/v1/folders/{folderId}',
      {
        params: { path: { folderId: testFolder.folder.id } },
        body: { name: updatedName },
      },
    )
    expect(updateFolderResponse.response.status).toEqual(200)

    const folderGetResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}',
      { params: { path: { folderId: testFolder.folder.id } } },
    )
    expect(folderGetResponse.response.status).toEqual(200)
    expect(folderGetResponse.data?.folder.id).toEqual(testFolder.folder.id)
    expect(folderGetResponse.data?.folder.name).toEqual(updatedName)
  })

  it(`should list a user's folders`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
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

    const folderListResponse =
      await apiClient(accessToken).GET('/api/v1/folders')
    expect(folderListResponse.response.status).toEqual(200)
    expect(folderListResponse.data?.meta.totalCount).toEqual(1)
    expect(folderListResponse.data?.result.length).toEqual(1)
  })

  it(`should delete a folder by id`, async () => {
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

    const folderGetResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}',
      { params: { path: { folderId: testFolder.folder.id } } },
    )
    expect(folderGetResponse.response.status).toEqual(200)
    expect(folderGetResponse.data?.folder.id).toEqual(testFolder.folder.id)

    const deleteFolderResponse = await apiClient(accessToken).DELETE(
      '/api/v1/folders/{folderId}',
      { params: { path: { folderId: testFolder.folder.id } } },
    )
    expect(deleteFolderResponse.response.status).toEqual(200)

    const secondFolderGetResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}',
      { params: { path: { folderId: testFolder.folder.id } } },
    )
    expect(secondFolderGetResponse.response.status).toEqual(404)
  })

  it(`should return 401 from get folder by id without token`, async () => {
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

    const folderGetResponse = await apiClient().GET(
      '/api/v1/folders/{folderId}',
      { params: { path: { folderId: testFolder.folder.id } } },
    )
    expect(folderGetResponse.response.status).toEqual(401)
  })

  it(`should return 404 from get folder by id with valid token of non-owner user`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const {
      session: { accessToken: secondUserAccessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser2',
      password: '123',
    })

    const bucketNameNonOwner = await testModule!.initMinioTestBucket([])
    const metadataBucketNameNonOwner = await testModule!.initMinioTestBucket()

    const folderCreateResponse = await apiClient(accessToken).POST(
      '/api/v1/folders',
      {
        body: {
          name: 'My Folder',
          contentLocation: testS3Location({ bucketName: bucketNameNonOwner }),
          metadataLocation: testS3Location({
            bucketName: metadataBucketNameNonOwner,
          }),
        },
      },
    )
    expect(folderCreateResponse.response.status).toEqual(201)
    expect(folderCreateResponse.data?.folder.id).toBeDefined()

    const folderId3 = folderCreateResponse.data?.folder.id
    if (!folderId3) {
      throw new Error('No folder id')
    }
    const folderGetResponse = await apiClient(secondUserAccessToken).GET(
      '/api/v1/folders/{folderId}',
      { params: { path: { folderId: folderId3 } } },
    )
    expect(folderGetResponse.response.status).toEqual(404)
  })

  it(`it should scan the storage location represented by a folder`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const MOCK_OBJECTS: { objectKey: string; content: string }[] = [
      { content: 'object 1 content', objectKey: 'key1' },
      { content: 'object 2 content', objectKey: 'key2' },
    ]

    const testFolder = await createTestFolder({
      folderName: 'My Folder',

      testModule: testModule!,
      accessToken,
      mockFiles: MOCK_OBJECTS,
      apiClient,
    })

    expect(testFolder.folder.id).toBeTruthy()

    const folderGetResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}',
      { params: { path: { folderId: testFolder.folder.id } } },
    )

    expect(folderGetResponse.response.status).toEqual(200)
    expect(folderGetResponse.data?.folder.id).toEqual(testFolder.folder.id)

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    // wait to see that a job was run (we know it's our job)
    await testModule!.waitForTasks('completed', {
      taskIdentifiers: [CoreTaskName.ReindexFolder],
    })

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      { params: { path: { folderId: testFolder.folder.id } } },
    )

    expect(listObjectsResponse.data?.result.length ?? 0).toBeGreaterThan(0)
  })

  it(`should result in the correct bucket config for a server location backed folder`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
      admin: true,
    })

    const serverProvisionBucket = await testModule!.initMinioTestBucket()
    const serverS3Config = testModule!.testS3ClientConfig()
    const storageProvisionInput = {
      label: 'Test Provision',
      description: 'This is a test provision',
      accessKeyId: serverS3Config.accessKeyId,
      secretAccessKey: serverS3Config.secretAccessKey,
      bucket: serverProvisionBucket,
      prefix: 'someserverprefix',
      endpoint: serverS3Config.endpoint,
      region: serverS3Config.region,
      provisionTypes: [StorageProvisionTypeEnum.CONTENT],
    }

    const _storageProvision = await apiClient(accessToken).POST(
      '/api/v1/server/storage-provisions',
      {
        body: {
          label: storageProvisionInput.label,
          description: storageProvisionInput.description,
          accessKeyId: storageProvisionInput.accessKeyId,
          secretAccessKey: storageProvisionInput.secretAccessKey,
          bucket: storageProvisionInput.bucket,
          prefix: storageProvisionInput.prefix,
          endpoint: storageProvisionInput.endpoint,
          region: storageProvisionInput.region,
          provisionTypes: storageProvisionInput.provisionTypes,
        },
      },
    )
    const provisionId = _storageProvision.data?.result[0]?.id
    if (!provisionId) {
      throw new Error('No provision id')
    }

    const folderCreateResponse = await apiClient(accessToken).POST(
      '/api/v1/folders',
      {
        body: {
          name: 'My Folder',
          contentLocation: {
            storageProvisionId: provisionId,
          },
          metadataLocation: {
            storageProvisionId: provisionId,
          },
        },
      },
    )
    expect(folderCreateResponse.response.status).toBe(201)
    // validate content location
    expect(folderCreateResponse.data?.folder.contentLocation.providerType).toBe(
      'SERVER',
    )
    expect(folderCreateResponse.data?.folder.contentLocation.endpoint).toBe(
      storageProvisionInput.endpoint,
    )
    expect(folderCreateResponse.data?.folder.contentLocation.bucket).toBe(
      storageProvisionInput.bucket,
    )
    expect(folderCreateResponse.data?.folder.contentLocation.region).toBe(
      storageProvisionInput.region,
    )
    expect(folderCreateResponse.data?.folder.contentLocation.accessKeyId).toBe(
      storageProvisionInput.accessKeyId,
    )
    expect(folderCreateResponse.data?.folder.contentLocation.prefix).toBe(
      `${storageProvisionInput.prefix}/.lombok_folder_content_${folderCreateResponse.data?.folder.id}`,
    )

    // validate metadata location
    expect(
      folderCreateResponse.data?.folder.metadataLocation.providerType,
    ).toBe('SERVER')
    expect(folderCreateResponse.data?.folder.metadataLocation.endpoint).toBe(
      storageProvisionInput.endpoint,
    )
    expect(folderCreateResponse.data?.folder.metadataLocation.bucket).toBe(
      storageProvisionInput.bucket,
    )
    expect(folderCreateResponse.data?.folder.metadataLocation.region).toBe(
      storageProvisionInput.region,
    )
    expect(folderCreateResponse.data?.folder.metadataLocation.accessKeyId).toBe(
      storageProvisionInput.accessKeyId,
    )
    expect(folderCreateResponse.data?.folder.metadataLocation.prefix).toBe(
      `${storageProvisionInput.prefix}/.lombok_folder_metadata_${folderCreateResponse.data?.folder.id}`,
    )
  })

  it(`should result in the correct bucket config for a user location backed folder`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
      admin: true,
    })

    const userLocationBucket = await testModule!.initMinioTestBucket()
    const storageLocationInput = testS3Location({
      bucketName: userLocationBucket,
      prefix: 'someserverprefix',
    })

    const folderCreateResponse = await apiClient(accessToken).POST(
      '/api/v1/folders',
      {
        body: {
          name: 'My Folder',
          contentLocation: {
            ...storageLocationInput,
          },
          metadataLocation: {
            ...storageLocationInput,
            prefix: 'someserverprefixmetadata',
          },
        },
      },
    )
    expect(folderCreateResponse.response.status).toBe(201)
    // validate content location
    expect(folderCreateResponse.data?.folder.contentLocation.providerType).toBe(
      'USER',
    )
    expect(folderCreateResponse.data?.folder.contentLocation.endpoint).toBe(
      storageLocationInput.endpoint,
    )
    expect(folderCreateResponse.data?.folder.contentLocation.bucket).toBe(
      storageLocationInput.bucket,
    )
    expect(folderCreateResponse.data?.folder.contentLocation.region).toBe(
      storageLocationInput.region,
    )
    expect(folderCreateResponse.data?.folder.contentLocation.accessKeyId).toBe(
      storageLocationInput.accessKeyId,
    )
    expect(folderCreateResponse.data?.folder.contentLocation.prefix).toBe(
      storageLocationInput.prefix,
    )
    // metadata content location
    expect(
      folderCreateResponse.data?.folder.metadataLocation.providerType,
    ).toBe('USER')
    expect(folderCreateResponse.data?.folder.metadataLocation.endpoint).toBe(
      storageLocationInput.endpoint,
    )
    expect(folderCreateResponse.data?.folder.metadataLocation.bucket).toBe(
      storageLocationInput.bucket,
    )
    expect(folderCreateResponse.data?.folder.metadataLocation.region).toBe(
      storageLocationInput.region,
    )
    expect(folderCreateResponse.data?.folder.metadataLocation.accessKeyId).toBe(
      storageLocationInput.accessKeyId,
    )
    expect(folderCreateResponse.data?.folder.metadataLocation.prefix).toBe(
      `someserverprefixmetadata`,
    )
  })

  it(`should create correct presigned URLs for a server location backed folder`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
      admin: true,
    })

    const serverPresignBucket = await testModule!.initMinioTestBucket()
    const serverPresignConfig = testModule!.testS3ClientConfig()
    const storageProvisionInput = {
      label: 'Test Provision',
      description: 'This is a test provision',
      accessKeyId: serverPresignConfig.accessKeyId,
      secretAccessKey: serverPresignConfig.secretAccessKey,
      bucket: serverPresignBucket,
      prefix: 'someserverprefix',
      endpoint: serverPresignConfig.endpoint,
      region: serverPresignConfig.region,
      provisionTypes: [StorageProvisionTypeEnum.CONTENT],
    }

    const _storageProvision = await apiClient(accessToken).POST(
      '/api/v1/server/storage-provisions',
      {
        body: {
          label: storageProvisionInput.label,
          description: storageProvisionInput.description,
          accessKeyId: storageProvisionInput.accessKeyId,
          secretAccessKey: storageProvisionInput.secretAccessKey,
          bucket: storageProvisionInput.bucket,
          prefix: storageProvisionInput.prefix,
          endpoint: storageProvisionInput.endpoint,
          region: storageProvisionInput.region,
          provisionTypes: storageProvisionInput.provisionTypes,
        },
      },
    )
    const provisionId = _storageProvision.data?.result[0]?.id
    if (!provisionId) {
      throw new Error('No provision id')
    }
    const folderCreateResponse = await apiClient(accessToken).POST(
      '/api/v1/folders',
      {
        body: {
          name: 'My Folder',
          contentLocation: {
            storageProvisionId: provisionId,
          },
          metadataLocation: {
            storageProvisionId: provisionId,
          },
        },
      },
    )
    expect(folderCreateResponse.response.status).toBe(201)

    const folderId = folderCreateResponse.data?.folder.id
    if (!folderId) {
      throw new Error('No folder id')
    }
    const presignedUrls = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/presigned-urls',
      {
        params: { path: { folderId } },
        body: [
          {
            method: 'PUT',
            objectIdentifier: 'content:someobjectkey',
          },
          {
            method: 'GET',
            objectIdentifier: 'metadata:someobjectkey:somehash',
          },
        ],
      },
    )

    expect(presignedUrls.response.status).toBe(201)

    const expectedContentUrlPrefix = `${storageProvisionInput.endpoint}/${storageProvisionInput.bucket}/${storageProvisionInput.prefix}/.lombok_folder_content_${folderCreateResponse.data?.folder.id}/someobjectkey?`
    expect(
      presignedUrls.data?.urls[0]?.slice(0, expectedContentUrlPrefix.length),
    ).toBe(expectedContentUrlPrefix)

    const expectedMetadataUrlPrefix = `${storageProvisionInput.endpoint}/${storageProvisionInput.bucket}/${storageProvisionInput.prefix}/.lombok_folder_metadata_${folderCreateResponse.data?.folder.id}/someobjectkey/somehash`
    expect(
      presignedUrls.data?.urls[1]?.slice(0, expectedMetadataUrlPrefix.length),
    ).toBe(expectedMetadataUrlPrefix)
  })

  it(`should create correct presigned URLs for a user location backed folder`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
      admin: true,
    })

    const userPresignContentBucket = await testModule!.initMinioTestBucket([])
    const userPresignMetadataBucket = await testModule!.initMinioTestBucket()
    const userPresignConfig = testModule!.testS3ClientConfig()

    const folderCreateResponse = await apiClient(accessToken).POST(
      '/api/v1/folders',
      {
        body: {
          name: 'My Folder',
          contentLocation: {
            ...testS3Location({
              bucketName: userPresignContentBucket,
              prefix: 'content_prefix',
            }),
          },
          metadataLocation: {
            ...testS3Location({
              bucketName: userPresignMetadataBucket,
              prefix: 'metadata_prefix',
            }),
          },
        },
      },
    )
    expect(folderCreateResponse.response.status).toBe(201)

    const presignedUrls = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/presigned-urls',
      {
        params: {
          path: { folderId: folderCreateResponse.data?.folder.id ?? '' },
        },
        body: [
          {
            method: 'PUT',
            objectIdentifier: 'content:someobjectkey',
          },
          {
            method: 'GET',
            objectIdentifier: 'metadata:someobjectkey:somehash',
          },
        ],
      },
    )

    expect(presignedUrls.response.status).toBe(201)

    const expectedContentUrlPrefix = `${userPresignConfig.endpoint}/${userPresignContentBucket}/content_prefix/someobjectkey`
    expect(
      presignedUrls.data?.urls[0]?.slice(0, expectedContentUrlPrefix.length),
    ).toBe(expectedContentUrlPrefix)

    const expectedMetadataUrlPrefix = `${userPresignConfig.endpoint}/${userPresignMetadataBucket}/metadata_prefix/someobjectkey/somehash?`
    expect(
      presignedUrls.data?.urls[1]?.slice(0, expectedMetadataUrlPrefix.length),
    ).toBe(expectedMetadataUrlPrefix)
  })

  it(`should create correct presigned URLs for a user location backed folder and separate metadata location`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
      admin: true,
    })

    const sepContentBucket = await testModule!.initMinioTestBucket([])
    const sepMetadataBucket = await testModule!.initMinioTestBucket()
    const sepConfig = testModule!.testS3ClientConfig()

    const folderCreateResponse = await apiClient(accessToken).POST(
      '/api/v1/folders',
      {
        body: {
          name: 'My Folder',
          contentLocation: testS3Location({
            bucketName: sepContentBucket,
            prefix: '',
          }),
          metadataLocation: testS3Location({
            bucketName: sepMetadataBucket,
            prefix: '',
          }),
        },
      },
    )
    expect(folderCreateResponse.response.status).toBe(201)

    const presignedUrls = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/presigned-urls',
      {
        params: {
          path: { folderId: folderCreateResponse.data?.folder.id ?? '' },
        },
        body: [
          {
            method: 'PUT',
            objectIdentifier: 'content:someobjectkey',
          },
          {
            method: 'GET',
            objectIdentifier: 'metadata:someobjectkey:somehash',
          },
        ],
      },
    )

    expect(presignedUrls.response.status).toBe(201)

    const expectedContentUrlPrefix = `${sepConfig.endpoint}/${sepContentBucket}/someobjectkey?`
    expect(
      presignedUrls.data?.urls[0]?.slice(0, expectedContentUrlPrefix.length),
    ).toBe(expectedContentUrlPrefix)
    const expectedMetadataUrlPrefix = `${sepConfig.endpoint}/${sepMetadataBucket}/someobjectkey/somehash?`
    expect(
      presignedUrls.data?.urls[1]?.slice(0, expectedMetadataUrlPrefix.length),
    ).toBe(expectedMetadataUrlPrefix)
  })

  it(`should error when generating write operation presigned URLs (DELETE, PUT) for metadata locations`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
      admin: true,
    })

    const writeOpContentBucket = await testModule!.initMinioTestBucket([])
    const writeOpMetadataBucket = await testModule!.initMinioTestBucket()

    const folderCreateResponse = await apiClient(accessToken).POST(
      '/api/v1/folders',
      {
        body: {
          name: 'My Folder',
          contentLocation: testS3Location({
            bucketName: writeOpContentBucket,
            prefix: '',
          }),
          metadataLocation: testS3Location({
            bucketName: writeOpMetadataBucket,
            prefix: '',
          }),
        },
      },
    )
    expect(folderCreateResponse.response.status).toBe(201)
    const folderId2 = folderCreateResponse.data?.folder.id
    if (!folderId2) {
      throw new Error('No folder id')
    }
    const presignedUrlsGet = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/presigned-urls',
      {
        params: { path: { folderId: folderId2 } },
        body: [
          {
            method: 'GET',
            objectIdentifier: 'metadata:someobjectkey:somehash',
          },
        ],
      },
    )
    expect(presignedUrlsGet.response.status).toBe(201)

    const presignedUrls = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/presigned-urls',
      {
        params: {
          path: { folderId: folderCreateResponse.data?.folder.id ?? '' },
        },
        body: [
          {
            method: 'PUT',
            objectIdentifier: 'metadata:someobjectkey:somehash',
          },
        ],
      },
    )

    expect(presignedUrls.response.status).toBe(401)

    const presignedUrls2 = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/presigned-urls',
      {
        params: {
          path: { folderId: folderCreateResponse.data?.folder.id ?? '' },
        },
        body: [
          {
            method: 'DELETE',
            objectIdentifier: 'metadata:someobjectkey:somehash',
          },
        ],
      },
    )

    expect(presignedUrls2.response.status).toBe(401)
  })

  it(`should 401 on create folder without token`, async () => {
    const contentBucketNoToken = await testModule!.initMinioTestBucket([])
    const metadataBucketNoToken = await testModule!.initMinioTestBucket()

    const response = await apiClient().POST('/api/v1/folders', {
      body: {
        name: '__dummy__',
        contentLocation: {
          accessKeyId: '__dummy__',
          secretAccessKey: '__dummy__',
          endpoint: '__dummy__',
          bucket: contentBucketNoToken,
          region: '__dummy__',
          prefix: '__dummy__',
        },
        metadataLocation: {
          accessKeyId: '__dummy__',
          secretAccessKey: '__dummy__',
          endpoint: '__dummy__',
          bucket: metadataBucketNoToken,
          region: '__dummy__',
          prefix: '__dummy__',
        },
      },
    })

    expect(response.response.status).toEqual(401)
  })

  it(`should 401 on list folders without token`, async () => {
    const response = await apiClient().GET('/api/v1/folders')

    expect(response.response.status).toEqual(401)
  })

  it(`should 401 on reindex folder without token`, async () => {
    const response = await apiClient().POST(
      '/api/v1/folders/{folderId}/reindex',
      {
        params: { path: { folderId: '__dummy__' } },
      },
    )

    expect(response.response.status).toEqual(401)
  })

  it(`should 401 on get folder metadata without token`, async () => {
    const response = await apiClient().GET(
      '/api/v1/folders/{folderId}/metadata',
      { params: { path: { folderId: '__dummy__' } } },
    )

    expect(response.response.status).toEqual(401)
  })

  it(`should 401 on delete folder without token`, async () => {
    const response = await apiClient().DELETE('/api/v1/folders/{folderId}', {
      params: { path: { folderId: '__dummy__' } },
    })

    expect(response.response.status).toEqual(401)
  })

  it(`should 401 on createPresignedUrls without token`, async () => {
    const response = await apiClient().POST(
      '/api/v1/folders/{folderId}/presigned-urls',
      {
        params: { path: { folderId: '__dummy__' } },
        body: [{ method: 'GET', objectIdentifier: '__dummy__' }],
      },
    )

    expect(response.response.status).toEqual(401)
  })

  it(`should reject folder creation with empty name`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const bucketNameEmpty = await testModule!.initMinioTestBucket([])
    const metadataBucketNameEmpty = await testModule!.initMinioTestBucket()

    const response = await apiClient(accessToken).POST('/api/v1/folders', {
      body: {
        name: '',
        contentLocation: testS3Location({ bucketName: bucketNameEmpty }),
        metadataLocation: testS3Location({
          bucketName: metadataBucketNameEmpty,
        }),
      },
    })

    expect(response.response.status).toEqual(400)
  })

  it(`should reject folder creation with name longer than 256 characters`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const longName = 'a'.repeat(257)

    const bucketNameTooLong = await testModule!.initMinioTestBucket([])
    const metadataBucketNameTooLong = await testModule!.initMinioTestBucket()

    const response = await apiClient(accessToken).POST('/api/v1/folders', {
      body: {
        name: longName,
        contentLocation: testS3Location({ bucketName: bucketNameTooLong }),
        metadataLocation: testS3Location({
          bucketName: metadataBucketNameTooLong,
        }),
      },
    })

    expect(response.response.status).toEqual(400)
  })

  it(`should accept folder creation with name exactly 256 characters`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const maxLengthName = 'a'.repeat(256)

    const bucketNameMax = await testModule!.initMinioTestBucket([])
    const metadataBucketNameMax = await testModule!.initMinioTestBucket()

    const response = await apiClient(accessToken).POST('/api/v1/folders', {
      body: {
        name: maxLengthName,
        contentLocation: testS3Location({ bucketName: bucketNameMax }),
        metadataLocation: testS3Location({ bucketName: metadataBucketNameMax }),
      },
    })

    expect(response.response.status).toEqual(201)
    expect(response.data?.folder.name).toEqual(maxLengthName)
  })

  it(`should reject folder update with empty name`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Original Folder Name',
      apiClient,
      testModule,
      accessToken,
      mockFiles: [],
    })

    const response = await apiClient(accessToken).PUT(
      '/api/v1/folders/{folderId}',
      {
        params: { path: { folderId: testFolder.folder.id } },
        body: { name: '' },
      },
    )

    expect(response.response.status).toEqual(400)
  })

  it(`should reject folder update with name longer than 256 characters`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Original Folder Name',
      apiClient,
      testModule,
      accessToken,
      mockFiles: [],
    })

    const longName = 'a'.repeat(257)

    const response = await apiClient(accessToken).PUT(
      '/api/v1/folders/{folderId}',
      {
        params: { path: { folderId: testFolder.folder.id } },
        body: { name: longName },
      },
    )

    expect(response.response.status).toEqual(400)
  })

  it(`should accept folder update with name exactly 256 characters`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Original Folder Name',
      apiClient,
      testModule,
      accessToken,
      mockFiles: [],
    })

    const maxLengthName = 'a'.repeat(256)

    const response = await apiClient(accessToken).PUT(
      '/api/v1/folders/{folderId}',
      {
        params: { path: { folderId: testFolder.folder.id } },
        body: { name: maxLengthName },
      },
    )

    expect(response.response.status).toEqual(200)

    // Verify the update persisted
    const folderGetResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}',
      { params: { path: { folderId: testFolder.folder.id } } },
    )

    expect(folderGetResponse.response.status).toEqual(200)
    expect(folderGetResponse.data?.folder.name).toEqual(maxLengthName)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
