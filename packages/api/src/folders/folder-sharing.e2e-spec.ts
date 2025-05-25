import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestUser,
  testS3Location,
} from 'src/test/test.util'

const TEST_MODULE_KEY = 'folders_shared'

describe('Shared folders', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  it(`should create a folder and share it with another user`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    const {
      session: { accessToken: secondUserAccessToken },
    } = await createTestUser(testModule, {
      username: 'testuser2',
      password: '123',
    })

    const secondUser = await apiClient
      .viewerApi({ accessToken: secondUserAccessToken })
      .getViewer()

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

    const shareFolderResponse = await apiClient
      .foldersApi({ accessToken })
      .upsertFolderShare({
        folderShareCreateInputDTO: {
          permissions: ['OBJECT_EDIT', 'OBJECT_MANAGE'],
        },
        folderId: createResponse.data.folder.id,
        userId: secondUser.data.user.id,
      })

    expect(shareFolderResponse.status).toEqual(201)

    // test we can get the folder by id as the shared user
    const folderGetResponse = await apiClient
      .foldersApi({ accessToken: secondUserAccessToken })
      .getFolder({ folderId: createResponse.data.folder.id })

    expect(folderGetResponse.status).toEqual(200)
    expect(folderGetResponse.data.folder.id).toEqual(
      createResponse.data.folder.id,
    )

    // test we can see the folder in the list folders request as the shared user
    const folderListResponse = await apiClient
      .foldersApi({ accessToken: secondUserAccessToken })
      .listFolders()

    expect(folderListResponse.status).toEqual(200)
    expect(folderListResponse.data.meta.totalCount).toEqual(1)
    expect(folderListResponse.data.result[0].folder.id).toEqual(
      folderGetResponse.data.folder.id,
    )

    expect(folderListResponse.data.result[0].permissions).toEqual([
      'OBJECT_EDIT',
      'OBJECT_MANAGE',
    ])
  })

  it('should modify folder share permissions', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    const {
      session: { accessToken: secondUserAccessToken },
    } = await createTestUser(testModule, {
      username: 'testuser2',
      password: '123',
    })

    const secondUser = await apiClient
      .viewerApi({ accessToken: secondUserAccessToken })
      .getViewer()

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

    // Initially share with OBJECT_EDIT permission
    const initialShareResponse = await apiClient
      .foldersApi({ accessToken })
      .upsertFolderShare({
        folderShareCreateInputDTO: {
          permissions: ['OBJECT_EDIT'],
        },
        folderId: createResponse.data.folder.id,
        userId: secondUser.data.user.id,
      })

    expect(initialShareResponse.status).toEqual(201)

    // Modify share to add OBJECT_MANAGE permission
    const modifyShareResponse = await apiClient
      .foldersApi({ accessToken })
      .upsertFolderShare({
        folderShareCreateInputDTO: {
          permissions: ['OBJECT_EDIT', 'OBJECT_MANAGE'],
        },
        folderId: createResponse.data.folder.id,
        userId: secondUser.data.user.id,
      })

    expect(modifyShareResponse.status).toEqual(201)

    // Verify the updated permissions
    const folderListResponse = await apiClient
      .foldersApi({ accessToken: secondUserAccessToken })
      .listFolders()

    expect(folderListResponse.status).toEqual(200)
    expect(folderListResponse.data.result[0].permissions).toEqual([
      'OBJECT_EDIT',
      'OBJECT_MANAGE',
    ])
  })

  it('should remove folder share and prevent access', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    const {
      session: { accessToken: secondUserAccessToken },
    } = await createTestUser(testModule, {
      username: 'testuser2',
      password: '123',
    })

    const secondUser = await apiClient
      .viewerApi({ accessToken: secondUserAccessToken })
      .getViewer()

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

    // Initially share the folder
    const shareResponse = await apiClient
      .foldersApi({ accessToken })
      .upsertFolderShare({
        folderShareCreateInputDTO: {
          permissions: ['OBJECT_EDIT'],
        },
        folderId: createResponse.data.folder.id,
        userId: secondUser.data.user.id,
      })

    expect(shareResponse.status).toEqual(201)

    // Verify initial access
    const initialFolderListResponse = await apiClient
      .foldersApi({ accessToken: secondUserAccessToken })
      .listFolders()

    expect(initialFolderListResponse.status).toEqual(200)
    expect(initialFolderListResponse.data.meta.totalCount).toEqual(1)

    // Remove the share
    const removeShareResponse = await apiClient
      .foldersApi({ accessToken })
      .removeFolderShare({
        folderId: createResponse.data.folder.id,
        userId: secondUser.data.user.id,
      })

    expect(removeShareResponse.status).toEqual(200)

    // Verify the second user can no longer access the folder
    const finalFolderListResponse = await apiClient
      .foldersApi({ accessToken: secondUserAccessToken })
      .listFolders()

    expect(finalFolderListResponse.status).toEqual(200)
    expect(finalFolderListResponse.data.meta.totalCount).toEqual(0)

    // Verify direct folder access is also denied
    const folderGetResponse = await apiClient
      .foldersApi({ accessToken: secondUserAccessToken })
      .getFolder({ folderId: createResponse.data.folder.id })

    expect(folderGetResponse.status).toEqual(404)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
