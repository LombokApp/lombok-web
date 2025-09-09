import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
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

    const secondUser = await apiClient(secondUserAccessToken).GET(
      '/api/v1/viewer',
    )

    if (!secondUser.data) {
      throw new Error('Failed to get second user')
    }

    const bucketName = (await testModule?.initMinioTestBucket([])) ?? ''
    const metadataBucketName = (await testModule?.initMinioTestBucket()) ?? ''

    const createResponse = await apiClient(accessToken).POST(
      '/api/v1/folders',
      {
        body: {
          name: 'My test folder',
          contentLocation: testS3Location({ bucketName }),
          metadataLocation: testS3Location({ bucketName: metadataBucketName }),
        },
      },
    )

    if (!createResponse.data) {
      throw new Error('Failed to create folder')
    }

    expect(createResponse.data.folder.id).toBeTruthy()

    const shareFolderResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/shares/{userId}',
      {
        params: {
          path: {
            folderId: createResponse.data.folder.id,
            userId: secondUser.data.user.id,
          },
        },
        body: {
          permissions: ['OBJECT_EDIT', 'OBJECT_MANAGE'],
        },
      },
    )

    expect(shareFolderResponse.response.status).toEqual(201)
    expect(shareFolderResponse.data).toBeDefined()

    // test we can get the folder by id as the shared user
    const folderGetResponse = await apiClient(secondUserAccessToken).GET(
      '/api/v1/folders/{folderId}',
      {
        params: { path: { folderId: createResponse.data.folder.id } },
      },
    )

    expect(folderGetResponse.data).toBeDefined()

    if (!folderGetResponse.data) {
      throw new Error('Failed to get folder')
    }

    expect(folderGetResponse.data.folder.id).toEqual(
      createResponse.data.folder.id,
    )

    // test we can see the folder in the list folders request as the shared user
    const folderListResponse = await apiClient(secondUserAccessToken).GET(
      '/api/v1/folders',
    )

    expect(folderListResponse.data).toBeDefined()

    if (!folderListResponse.data) {
      throw new Error('Failed to list folders')
    }

    expect(folderListResponse.response.status).toEqual(200)
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

    const secondUser = await apiClient(secondUserAccessToken).GET(
      '/api/v1/viewer',
    )

    if (!secondUser.data) {
      throw new Error('Failed to get second user')
    }

    const bucketName = (await testModule?.initMinioTestBucket([])) ?? ''
    const metadataBucketName = (await testModule?.initMinioTestBucket()) ?? ''

    const createResponse = await apiClient(accessToken).POST(
      '/api/v1/folders',
      {
        body: {
          name: 'My test folder',
          contentLocation: testS3Location({ bucketName }),
          metadataLocation: testS3Location({ bucketName: metadataBucketName }),
        },
      },
    )

    if (!createResponse.data) {
      throw new Error('Failed to create folder')
    }

    // Initially share with OBJECT_EDIT permission
    const initialShareResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/shares/{userId}',
      {
        params: {
          path: {
            folderId: createResponse.data.folder.id,
            userId: secondUser.data.user.id,
          },
        },
        body: {
          permissions: ['OBJECT_EDIT'],
        },
      },
    )

    expect(initialShareResponse.error).toBeUndefined()
    expect(initialShareResponse.data).toBeDefined()

    // Modify share to add OBJECT_MANAGE permission
    const modifyShareResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/shares/{userId}',
      {
        params: {
          path: {
            folderId: createResponse.data.folder.id,
            userId: secondUser.data.user.id,
          },
        },
        body: {
          permissions: ['OBJECT_EDIT', 'OBJECT_MANAGE'],
        },
      },
    )

    expect(modifyShareResponse.error).toBeUndefined()
    expect(modifyShareResponse.data).toBeDefined()

    // Verify the updated permissions
    const folderListResponse = await apiClient(secondUserAccessToken).GET(
      '/api/v1/folders',
    )

    expect(folderListResponse.error).toBeUndefined()
    expect(folderListResponse.data).toBeDefined()

    if (!folderListResponse.data) {
      throw new Error('Failed to list folders')
    }

    expect(folderListResponse.data.result[0].permissions).toEqual([
      'OBJECT_EDIT',
      'OBJECT_MANAGE',
    ])
  })

  it('should remove folder share and prevent access', async () => {
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

    const secondUser = await apiClient(secondUserAccessToken).GET(
      '/api/v1/viewer',
    )

    if (!secondUser.data) {
      throw new Error('Failed to get second user')
    }

    const bucketName = (await testModule?.initMinioTestBucket([])) ?? ''
    const metadataBucketName = (await testModule?.initMinioTestBucket()) ?? ''

    const createResponse = await apiClient(accessToken).POST(
      '/api/v1/folders',
      {
        body: {
          name: 'My test folder',
          contentLocation: testS3Location({ bucketName }),
          metadataLocation: testS3Location({ bucketName: metadataBucketName }),
        },
      },
    )

    if (!createResponse.data) {
      throw new Error('Failed to create folder')
    }

    // Initially share the folder
    const shareResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/shares/{userId}',
      {
        params: {
          path: {
            folderId: createResponse.data.folder.id,
            userId: secondUser.data.user.id,
          },
        },
        body: {
          permissions: ['OBJECT_EDIT'],
        },
      },
    )

    expect(shareResponse.error).toBeUndefined()
    expect(shareResponse.data).toBeDefined()

    // Verify initial access
    const initialFolderListResponse = await apiClient(
      secondUserAccessToken,
    ).GET('/api/v1/folders')

    expect(initialFolderListResponse.error).toBeUndefined()
    expect(initialFolderListResponse.data).toBeDefined()

    if (!initialFolderListResponse.data) {
      throw new Error('Failed to list folders')
    }

    expect(initialFolderListResponse.data.meta.totalCount).toEqual(1)

    // Remove the share
    const removeShareResponse = await apiClient(accessToken).DELETE(
      '/api/v1/folders/{folderId}/shares/{userId}',
      {
        params: {
          path: {
            folderId: createResponse.data.folder.id,
            userId: secondUser.data.user.id,
          },
        },
      },
    )

    expect(removeShareResponse.error).toBeUndefined()

    // Verify the second user can no longer access the folder
    const finalFolderListResponse = await apiClient(secondUserAccessToken).GET(
      '/api/v1/folders',
    )

    expect(finalFolderListResponse.error).toBeUndefined()
    expect(finalFolderListResponse.data).toBeDefined()

    if (!finalFolderListResponse.data) {
      throw new Error('Failed to list folders')
    }

    expect(finalFolderListResponse.data.meta.totalCount).toEqual(0)

    // Verify direct folder access is also denied
    const folderGetResponse = await apiClient(secondUserAccessToken).GET(
      '/api/v1/folders/{folderId}',
      {
        params: { path: { folderId: createResponse.data.folder.id } },
      },
    )

    expect(folderGetResponse.error).toBeDefined()
    expect(folderGetResponse.response.status).toBe(404)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
