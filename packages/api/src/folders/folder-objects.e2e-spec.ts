import { MediaType, SignedURLsRequestMethod } from '@lombokapp/types'
import { encodeS3ObjectKey } from '@lombokapp/utils'
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

  describe('Media Type Resolution', () => {
    /**
     * Helper: creates a MinIO bucket, uploads a single file with a specific
     * Content-Type header, creates a folder pointing at it, reindexes, and
     * returns the folder ID so callers can list/refresh objects.
     */
    async function setupFolderWithTypedFile({
      accessToken,
      objectKey,
      contentType,
      body = 'test-content',
    }: {
      accessToken: string
      objectKey: string
      contentType: string
      body?: string
    }) {
      // Create content + metadata buckets
      const contentBucket = await testModule!.initMinioTestBucket()
      const metadataBucket = await testModule!.initMinioTestBucket()

      // Upload the file with an explicit Content-Type
      const [uploadUrl] = testModule!.createS3PresignedUrls([
        {
          bucket: contentBucket,
          objectKey,
          method: SignedURLsRequestMethod.PUT,
        },
      ])
      await fetch(uploadUrl!, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body,
      })

      // Create folder
      const { data } = await apiClient(accessToken).POST('/api/v1/folders', {
        body: {
          name: `media-type-test-${Date.now()}`,
          contentLocation: testS3Location({ bucketName: contentBucket }),
          metadataLocation: testS3Location({ bucketName: metadataBucket }),
        },
      })
      const folderId = data!.folder.id

      // Reindex to discover the object
      await reindexTestFolder({ accessToken, apiClient, folderId })
      await testModule!.waitForTasks('completed', {
        taskIdentifiers: [CoreTaskName.ReindexFolder],
      })

      return folderId
    }

    it('should resolve mediaType from extension when S3 Content-Type is non-standard (audio/x-m4a)', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'mediatype_user_1',
        password: '123',
      })

      const folderId = await setupFolderWithTypedFile({
        accessToken,
        objectKey: 'recording.m4a',
        contentType: 'audio/x-m4a',
      })

      // Refresh to trigger S3 HEAD → updateFolderObjectInDB with mimeType
      await apiClient(accessToken).POST(
        '/api/v1/folders/{folderId}/objects/{objectKey}/refresh',
        {
          params: {
            path: {
              folderId,
              objectKey: encodeS3ObjectKey('recording.m4a'),
            },
          },
        },
      )

      // Verify the object was classified correctly
      const { data } = await apiClient(accessToken).GET(
        '/api/v1/folders/{folderId}/objects',
        { params: { path: { folderId } } },
      )

      expect(data!.result).toHaveLength(1)
      expect(data!.result[0]!.mediaType).toBe(MediaType.AUDIO)
    })

    it('should resolve mediaType correctly when S3 Content-Type is a recognised MIME type', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'mediatype_user_2',
        password: '123',
      })

      const folderId = await setupFolderWithTypedFile({
        accessToken,
        objectKey: 'photo.jpg',
        contentType: 'image/jpeg',
      })

      await apiClient(accessToken).POST(
        '/api/v1/folders/{folderId}/objects/{objectKey}/refresh',
        {
          params: {
            path: {
              folderId,
              objectKey: encodeS3ObjectKey('photo.jpg'),
            },
          },
        },
      )

      const { data } = await apiClient(accessToken).GET(
        '/api/v1/folders/{folderId}/objects',
        { params: { path: { folderId } } },
      )

      expect(data!.result).toHaveLength(1)
      expect(data!.result[0]!.mediaType).toBe(MediaType.IMAGE)
      expect(data!.result[0]!.mimeType).toBe('image/jpeg')
    })

    it('should fall back to extension when S3 Content-Type is application/octet-stream', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'mediatype_user_3',
        password: '123',
      })

      const folderId = await setupFolderWithTypedFile({
        accessToken,
        objectKey: 'video.mp4',
        contentType: 'application/octet-stream',
      })

      await apiClient(accessToken).POST(
        '/api/v1/folders/{folderId}/objects/{objectKey}/refresh',
        {
          params: {
            path: {
              folderId,
              objectKey: encodeS3ObjectKey('video.mp4'),
            },
          },
        },
      )

      const { data } = await apiClient(accessToken).GET(
        '/api/v1/folders/{folderId}/objects',
        { params: { path: { folderId } } },
      )

      expect(data!.result).toHaveLength(1)
      expect(data!.result[0]!.mediaType).toBe(MediaType.VIDEO)
    })

    it('should resolve multiple file types correctly after reindex', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'mediatype_user_4',
        password: '123',
      })

      const testFolder = await createTestFolder({
        folderName: 'Multi Media Type Folder',
        testModule,
        accessToken,
        mockFiles: [
          { objectKey: 'song.mp3', content: 'fake-mp3' },
          { objectKey: 'image.png', content: 'fake-png' },
          { objectKey: 'document.pdf', content: 'fake-pdf' },
        ],
        apiClient,
      })

      await reindexTestFolder({
        accessToken,
        apiClient,
        folderId: testFolder.folder.id,
      })

      await testModule!.waitForTasks('completed', {
        taskIdentifiers: [CoreTaskName.ReindexFolder],
      })

      const { data } = await apiClient(accessToken).GET(
        '/api/v1/folders/{folderId}/objects',
        { params: { path: { folderId: testFolder.folder.id } } },
      )

      expect(data!.result).toHaveLength(3)

      const byKey = Object.fromEntries(
        data!.result.map((obj) => [obj.objectKey, obj]),
      )
      expect(byKey['song.mp3']!.mediaType).toBe(MediaType.AUDIO)
      expect(byKey['image.png']!.mediaType).toBe(MediaType.IMAGE)
      expect(byKey['document.pdf']!.mediaType).toBe(MediaType.DOCUMENT)
    })
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
