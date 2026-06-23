import { MediaType, SignedURLsRequestMethod } from '@lombokapp/types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { configureS3Client } from 'src/storage/s3.service'
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
              objectKey: 'recording.m4a',
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
              objectKey: 'photo.jpg',
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
              objectKey: 'video.mp4',
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

  describe('Object key encoding round-trip', () => {
    // Keys are opaque S3 byte strings: a real-slash key and a key whose name
    // literally contains "%2F" are distinct and must both resolve. Each layer
    // must encode/decode exactly once. openapi-fetch encodes the path param
    // once, so we pass the raw stored key here.
    it('resolves slash and literal-"%2F" keys distinctly via GET', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'objectkey_roundtrip_user',
        password: '123',
      })

      const slashKey = 'videos/career.mp4__clips/clip-4.mp4'
      const literalKey = 'videos%2Fcareer.mp4__clips%2Fclip-4.mp4'

      const testFolder = await createTestFolder({
        folderName: 'Object Key Encoding Folder',
        testModule,
        accessToken,
        mockFiles: [
          { objectKey: slashKey, content: 'slash content' },
          { objectKey: literalKey, content: 'literal content' },
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

      // Both keys are stored verbatim and remain distinct.
      const { data: listData } = await apiClient(accessToken).GET(
        '/api/v1/folders/{folderId}/objects',
        { params: { path: { folderId: testFolder.folder.id } } },
      )
      const storedKeys = listData!.result.map((o) => o.objectKey).sort()
      expect(storedKeys).toEqual([literalKey, slashKey].sort())

      // GET with the raw key resolves to that exact object, not the other one.
      const slashGet = await apiClient(accessToken).GET(
        '/api/v1/folders/{folderId}/objects/{objectKey}',
        {
          params: {
            path: { folderId: testFolder.folder.id, objectKey: slashKey },
          },
        },
      )
      expect(slashGet.response.status).toBe(200)
      expect(slashGet.data!.folderObject.objectKey).toBe(slashKey)

      const literalGet = await apiClient(accessToken).GET(
        '/api/v1/folders/{folderId}/objects/{objectKey}',
        {
          params: {
            path: { folderId: testFolder.folder.id, objectKey: literalKey },
          },
        },
      )
      expect(literalGet.response.status).toBe(200)
      expect(literalGet.data!.folderObject.objectKey).toBe(literalKey)
    })
  })

  describe('"%2F" handling on presign + folder prefix', () => {
    // List the raw keys stored in a folder's content bucket (verbatim, as S3
    // sees them) by resolving the folder's content location and listing it.
    async function listContentBucketKeys(folderId: string): Promise<string[]> {
      const folder = await testModule!.services.folderService.getFolder({
        folderId,
        includeContentLocation: true,
      })
      const loc = folder.contentLocation
      const s3Client = configureS3Client({
        accessKeyId: loc.accessKeyId,
        secretAccessKey: loc.secretAccessKey,
        endpoint: loc.endpoint,
        region: loc.region,
      })
      const res = await testModule!.services.s3Service.s3ListBucketObjects({
        s3Client,
        bucketName: loc.bucket,
        prefix: loc.prefix,
      })
      return res.result.map((o) => o.key)
    }

    it('PUT presign replaces "%2F" → "_" by default and returns the resolved key', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'pct_put_default',
        password: '123',
      })
      const testFolder = await createTestFolder({
        folderName: 'PUT default replace',
        testModule,
        accessToken,
        apiClient,
      })

      const res = await apiClient(accessToken).POST(
        '/api/v1/folders/{folderId}/presigned-urls',
        {
          params: { path: { folderId: testFolder.folder.id } },
          body: [
            {
              method: SignedURLsRequestMethod.PUT,
              objectIdentifier: { kind: 'content', objectKey: 'a%2Fb' },
            },
          ],
        },
      )

      expect(res.response.status).toBe(201)
      const entry = res.data!.urls[0]!
      expect(entry.objectKey).toBe('a_b')
      expect(entry.url).toContain('/a_b?')
      expect(entry.url).not.toContain('a%2Fb')
    })

    it('PUT presign with dontReplaceEncodedForwardSlashes keeps the literal key (overwrite case)', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'pct_put_literal',
        password: '123',
      })
      const testFolder = await createTestFolder({
        folderName: 'PUT keep literal',
        testModule,
        accessToken,
        apiClient,
      })

      const literalKey = 'a%2Fb'

      const putRes = await apiClient(accessToken).POST(
        '/api/v1/folders/{folderId}/presigned-urls',
        {
          params: { path: { folderId: testFolder.folder.id } },
          body: [
            {
              method: SignedURLsRequestMethod.PUT,
              objectIdentifier: { kind: 'content', objectKey: literalKey },
              dontReplaceEncodedForwardSlashes: true,
            },
          ],
        },
      )
      expect(putRes.response.status).toBe(201)
      const putEntry = putRes.data!.urls[0]!
      expect(putEntry.objectKey).toBe(literalKey)
      // The literal "%2F" is encoded as "%252F" in the signed path so S3
      // decodes it once back to the verbatim "%2F" key.
      expect(putEntry.url).toContain('/a%252Fb?')

      const uploadResponse = await fetch(putEntry.url, {
        method: 'PUT',
        body: 'literal-bytes',
      })
      expect(uploadResponse.status).toBe(200)

      // GET passes the literal key through unchanged and round-trips the bytes.
      const getRes = await apiClient(accessToken).POST(
        '/api/v1/folders/{folderId}/presigned-urls',
        {
          params: { path: { folderId: testFolder.folder.id } },
          body: [
            {
              method: SignedURLsRequestMethod.GET,
              objectIdentifier: { kind: 'content', objectKey: literalKey },
            },
          ],
        },
      )
      const getEntry = getRes.data!.urls[0]!
      expect(getEntry.objectKey).toBe(literalKey)
      const fetched = await fetch(getEntry.url)
      expect(fetched.status).toBe(200)
      expect(await fetched.text()).toBe('literal-bytes')
    })

    it('GET/HEAD presign passes a pre-existing "%2F" key through literally', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'pct_get_passthrough',
        password: '123',
      })
      const literalKey = 'seed%2Fkey.txt'
      const testFolder = await createTestFolder({
        folderName: 'GET passthrough',
        testModule,
        accessToken,
        mockFiles: [{ objectKey: literalKey, content: 'seeded-content' }],
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

      for (const method of [
        SignedURLsRequestMethod.GET,
        SignedURLsRequestMethod.HEAD,
      ]) {
        const res = await apiClient(accessToken).POST(
          '/api/v1/folders/{folderId}/presigned-urls',
          {
            params: { path: { folderId: testFolder.folder.id } },
            body: [
              {
                method,
                objectIdentifier: { kind: 'content', objectKey: literalKey },
              },
            ],
          },
        )
        const entry = res.data!.urls[0]!
        expect(entry.objectKey).toBe(literalKey)
        // "%2F" is encoded as "%252F" in the signed path (literal passthrough).
        expect(entry.url).toContain('/seed%252Fkey.txt?')
      }

      const getRes = await apiClient(accessToken).POST(
        '/api/v1/folders/{folderId}/presigned-urls',
        {
          params: { path: { folderId: testFolder.folder.id } },
          body: [
            {
              method: SignedURLsRequestMethod.GET,
              objectIdentifier: { kind: 'content', objectKey: literalKey },
            },
          ],
        },
      )
      const fetched = await fetch(getRes.data!.urls[0]!.url)
      expect(fetched.status).toBe(200)
      expect(await fetched.text()).toBe('seeded-content')
    })

    it('leaves real "/" keys untouched on PUT and GET', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'pct_real_slash',
        password: '123',
      })
      const testFolder = await createTestFolder({
        folderName: 'Real slash untouched',
        testModule,
        accessToken,
        apiClient,
      })

      const key = 'a/b/c.txt'

      const putRes = await apiClient(accessToken).POST(
        '/api/v1/folders/{folderId}/presigned-urls',
        {
          params: { path: { folderId: testFolder.folder.id } },
          body: [
            {
              method: SignedURLsRequestMethod.PUT,
              objectIdentifier: { kind: 'content', objectKey: key },
            },
          ],
        },
      )
      const putEntry = putRes.data!.urls[0]!
      expect(putEntry.objectKey).toBe(key)
      expect(putEntry.url).toContain('/a/b/c.txt?')
      const uploadResponse = await fetch(putEntry.url, {
        method: 'PUT',
        body: 'slash-bytes',
      })
      expect(uploadResponse.status).toBe(200)

      const getRes = await apiClient(accessToken).POST(
        '/api/v1/folders/{folderId}/presigned-urls',
        {
          params: { path: { folderId: testFolder.folder.id } },
          body: [
            {
              method: SignedURLsRequestMethod.GET,
              objectIdentifier: { kind: 'content', objectKey: key },
            },
          ],
        },
      )
      const getEntry = getRes.data!.urls[0]!
      expect(getEntry.objectKey).toBe(key)
      const fetched = await fetch(getEntry.url)
      expect(await fetched.text()).toBe('slash-bytes')
    })

    it('rejects folder creation when a location prefix contains "%2F"', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'pct_prefix_reject',
        password: '123',
      })
      const contentBucket = await testModule!.initMinioTestBucket()
      const metadataBucket = await testModule!.initMinioTestBucket()

      const res = await apiClient(accessToken).POST('/api/v1/folders', {
        body: {
          name: 'Bad Prefix Folder',
          contentLocation: testS3Location({
            bucketName: contentBucket,
            prefix: 'bad%2Fprefix',
          }),
          metadataLocation: testS3Location({ bucketName: metadataBucket }),
        },
      })
      expect(res.response.status).toBe(400)
    })

    it('keeps a pre-existing "%2F" object fully usable (get, refresh, delete)', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'pct_preexisting_usable',
        password: '123',
      })
      const literalKey = 'pre%2Fexisting.txt'
      const testFolder = await createTestFolder({
        folderName: 'Pre-existing usable',
        testModule,
        accessToken,
        mockFiles: [{ objectKey: literalKey, content: 'still-usable' }],
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

      const getObject = await apiClient(accessToken).GET(
        '/api/v1/folders/{folderId}/objects/{objectKey}',
        {
          params: {
            path: { folderId: testFolder.folder.id, objectKey: literalKey },
          },
        },
      )
      expect(getObject.response.status).toBe(200)
      expect(getObject.data!.folderObject.objectKey).toBe(literalKey)

      const refresh = await apiClient(accessToken).POST(
        '/api/v1/folders/{folderId}/objects/{objectKey}/refresh',
        {
          params: {
            path: { folderId: testFolder.folder.id, objectKey: literalKey },
          },
        },
      )
      expect(refresh.response.status).toBe(201)
      expect(refresh.data!.folderObject.objectKey).toBe(literalKey)

      const del = await apiClient(accessToken).DELETE(
        '/api/v1/folders/{folderId}/objects/{objectKey}',
        {
          params: {
            path: { folderId: testFolder.folder.id, objectKey: literalKey },
          },
        },
      )
      expect(del.response.status).toBe(200)
    })

    it('uploads clean keys verbatim (S3 + DB) and round-trips distinct content', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'pct_verbatim_upload',
        password: '123',
      })
      const testFolder = await createTestFolder({
        folderName: 'Verbatim upload',
        testModule,
        accessToken,
        apiClient,
      })

      const keyA = 'normal.txt'
      const keyB = 'nested/path/file.txt'

      const putRes = await apiClient(accessToken).POST(
        '/api/v1/folders/{folderId}/presigned-urls',
        {
          params: { path: { folderId: testFolder.folder.id } },
          body: [
            {
              method: SignedURLsRequestMethod.PUT,
              objectIdentifier: { kind: 'content', objectKey: keyA },
            },
            {
              method: SignedURLsRequestMethod.PUT,
              objectIdentifier: { kind: 'content', objectKey: keyB },
            },
          ],
        },
      )
      expect(putRes.data!.urls[0]!.objectKey).toBe(keyA)
      expect(putRes.data!.urls[1]!.objectKey).toBe(keyB)

      await fetch(putRes.data!.urls[0]!.url, { method: 'PUT', body: 'AAA' })
      await fetch(putRes.data!.urls[1]!.url, { method: 'PUT', body: 'BBB' })

      // S3 holds the keys verbatim.
      const bucketKeys = await listContentBucketKeys(testFolder.folder.id)
      expect(bucketKeys.sort()).toEqual([keyA, keyB].sort())

      // Refresh registers them verbatim in the DB.
      for (const objectKey of [keyA, keyB]) {
        await apiClient(accessToken).POST(
          '/api/v1/folders/{folderId}/objects/{objectKey}/refresh',
          {
            params: { path: { folderId: testFolder.folder.id, objectKey } },
          },
        )
      }
      const listData = await apiClient(accessToken).GET(
        '/api/v1/folders/{folderId}/objects',
        { params: { path: { folderId: testFolder.folder.id } } },
      )
      const dbKeys = listData.data!.result.map((o) => o.objectKey).sort()
      expect(dbKeys).toEqual([keyA, keyB].sort())

      // Distinct keys map back to distinct content via GET.
      const getRes = await apiClient(accessToken).POST(
        '/api/v1/folders/{folderId}/presigned-urls',
        {
          params: { path: { folderId: testFolder.folder.id } },
          body: [
            {
              method: SignedURLsRequestMethod.GET,
              objectIdentifier: { kind: 'content', objectKey: keyA },
            },
            {
              method: SignedURLsRequestMethod.GET,
              objectIdentifier: { kind: 'content', objectKey: keyB },
            },
          ],
        },
      )
      const fetchedA = await fetch(getRes.data!.urls[0]!.url)
      const fetchedB = await fetch(getRes.data!.urls[1]!.url)
      expect(await fetchedA.text()).toBe('AAA')
      expect(await fetchedB.text()).toBe('BBB')
    })
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
