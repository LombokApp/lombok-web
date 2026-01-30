import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
  reindexTestFolder,
} from 'src/test/test.util'

const TEST_MODULE_KEY = 'comments'

describe('Comments', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      // debug: true,
    })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
    testModule?.cleanupMinioTestBuckets()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  it('should require authentication for creating root comment', async () => {
    const response = await apiClient().POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: '__dummy__',
            folderObjectId: '__dummy__',
          },
        },
        body: {
          content: 'Test comment',
        },
      },
    )

    expect(response.response.status).toBe(401)
  })

  it('should require authentication for creating comment', async () => {
    const response = await apiClient().POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: '__dummy__',
            folderObjectId: '__dummy__',
          },
        },
        body: {
          content: 'Test comment',
          rootCommentId: '__dummy__',
        },
      },
    )

    expect(response.response.status).toBe(401)
  })

  it('should require authentication for listing all comments', async () => {
    const response = await apiClient().GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: '__dummy__',
            folderObjectId: '__dummy__',
          },
        },
      },
    )

    expect(response.response.status).toBe(401)
  })

  it('should require authentication for getting thread', async () => {
    const response = await apiClient().GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{rootId}/thread',
      {
        params: {
          path: {
            folderId: '__dummy__',
            folderObjectId: '__dummy__',
            rootId: '__dummy__',
          },
        },
      },
    )

    expect(response.response.status).toBe(401)
  })

  it('should require authentication for deleting comment', async () => {
    const response = await apiClient().DELETE(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{commentId}',
      {
        params: {
          path: {
            folderId: '__dummy__',
            folderObjectId: '__dummy__',
            commentId: '__dummy__',
          },
        },
      },
    )

    expect(response.response.status).toBe(401)
  })

  it('should create a root comment without anchor', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    // Get folder objects
    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Create root comment without anchor
    const createCommentResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'This is a root comment without anchor',
        },
      },
    )

    expect(createCommentResponse.response.status).toBe(201)
    if (!createCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }
    expect(createCommentResponse.data.comment.id).toBeTruthy()
    expect(createCommentResponse.data.comment.content).toBe(
      'This is a root comment without anchor',
    )
    expect(createCommentResponse.data.comment.rootId).toBeNull()
    expect(createCommentResponse.data.comment.anchor).toBeNull()
    expect(createCommentResponse.data.comment.author).toBeDefined()
    expect(createCommentResponse.data.comment.author.username).toBe('testuser')
  })

  it('should create a root comment with image anchor', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser2',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 2',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    const createCommentResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'This is a root comment with image anchor',
          anchor: {
            type: 'image_point',
            x: 0.5,
            y: 0.5,
          },
        },
      },
    )

    expect(createCommentResponse.response.status).toBe(201)
    if (!createCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }
    expect(createCommentResponse.data.comment.anchor).toBeDefined()
    if (!createCommentResponse.data.comment.anchor) {
      throw new Error('Anchor should be defined')
    }
    const anchor = createCommentResponse.data.comment.anchor
    expect(anchor.type).toBe('image_point')
    if (anchor.type === 'image_point') {
      expect(anchor.x).toBe(0.5)
      expect(anchor.y).toBe(0.5)
    }
  })

  it('should create a root comment with video anchor', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser3',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 3',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.mp4', content: 'test video content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    const createCommentResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'This is a root comment with video anchor',
          anchor: {
            type: 'video_point',
            t: 120.5,
            x: 0.3,
            y: 0.7,
          },
        },
      },
    )

    expect(createCommentResponse.response.status).toBe(201)
    if (!createCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }
    expect(createCommentResponse.data.comment.anchor).toBeDefined()
    if (!createCommentResponse.data.comment.anchor) {
      throw new Error('Anchor should be defined')
    }
    const anchor = createCommentResponse.data.comment.anchor
    expect(anchor.type).toBe('video_point')
    if (anchor.type === 'video_point') {
      expect(anchor.t).toBe(120.5)
    }
  })

  it('should create a root comment with audio anchor', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser4',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 4',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.mp3', content: 'test audio content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    const createCommentResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'This is a root comment with audio anchor',
          anchor: {
            type: 'audio_point',
            t: 45.2,
          },
        },
      },
    )

    expect(createCommentResponse.response.status).toBe(201)
    if (!createCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }
    expect(createCommentResponse.data.comment.anchor).toBeDefined()
    if (!createCommentResponse.data.comment.anchor) {
      throw new Error('Anchor should be defined')
    }
    const anchor = createCommentResponse.data.comment.anchor
    expect(anchor.type).toBe('audio_point')
    if (anchor.type === 'audio_point') {
      expect(anchor.t).toBe(45.2)
    }
  })

  it('should list root comments for a folder object', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser5',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 5',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Create multiple root comments
    const comment1Response = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'First root comment',
        },
      },
    )

    const comment2Response = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Second root comment',
          anchor: {
            type: 'image_point',
            x: 0.1,
            y: 0.2,
          },
        },
      },
    )

    expect(comment1Response.response.status).toBe(201)
    expect(comment2Response.response.status).toBe(201)

    // List root comments
    const listCommentsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
      },
    )

    expect(listCommentsResponse.response.status).toBe(200)
    expect(listCommentsResponse.data).toBeDefined()
    if (!listCommentsResponse.data) {
      throw new Error('No response data received')
    }
    // Filter to root comments only (rootId is null)
    const rootComments = listCommentsResponse.data.comments.filter(
      (c) => c.rootId === null,
    )
    expect(rootComments.length).toBe(2)
    // Should be ordered by created_at ascending (oldest first) for all comments endpoint
    expect(rootComments[0]?.content).toBe('First root comment')
    expect(rootComments[1]?.content).toBe('Second root comment')
  })

  it('should create a reply to a root comment', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser6',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 6',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Create root comment with anchor (required for replies)
    const rootCommentResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Root comment',
          anchor: {
            type: 'image_point',
            x: 0.5,
            y: 0.5,
          },
        },
      },
    )

    if (!rootCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }

    const rootCommentId = rootCommentResponse.data.comment.id

    // Create reply
    const replyResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'This is a comment',
          rootCommentId,
        },
      },
    )

    expect(replyResponse.response.status).toBe(201)
    if (!replyResponse.data?.comment.id) {
      throw new Error('No response data received')
    }
    expect(replyResponse.data.comment.content).toBe('This is a comment')
    expect(replyResponse.data.comment.rootId).toBe(rootCommentId)
    expect(replyResponse.data.comment.anchor).toBeNull()
    expect(replyResponse.data.comment.author).toBeDefined()
  })

  it('should create a reply with a quote', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser7',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 7',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Create root comment with anchor (required for replies)
    const rootCommentResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Root comment',
          anchor: {
            type: 'image_point',
            x: 0.5,
            y: 0.5,
          },
        },
      },
    )

    if (!rootCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }

    const rootCommentId = rootCommentResponse.data.comment.id

    // Create first reply
    const firstReplyResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'First reply',
          rootCommentId,
        },
      },
    )

    if (!firstReplyResponse.data?.comment.id) {
      throw new Error('No response data received')
    }

    const firstReplyId = firstReplyResponse.data.comment.id

    // Create second reply quoting the first reply
    const quotedReplyResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Second reply quoting first',
          quoteId: firstReplyId,
          rootCommentId,
        },
      },
    )

    expect(quotedReplyResponse.response.status).toBe(201)
    if (!quotedReplyResponse.data?.comment.id) {
      throw new Error('No response data received')
    }
    expect(quotedReplyResponse.data.comment.content).toBe(
      'Second reply quoting first',
    )
    expect(quotedReplyResponse.data.comment.rootId).toBe(rootCommentId)
    expect(quotedReplyResponse.data.comment.quoteId).toBe(firstReplyId)
    expect(quotedReplyResponse.data.comment.quotedComment).toBeDefined()
    if (!quotedReplyResponse.data.comment.quotedComment) {
      throw new Error('Quoted comment should be defined')
    }
    expect(quotedReplyResponse.data.comment.quotedComment.content).toBe(
      'First reply',
    )
  })

  it('should create a reply quoting the root comment', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser7b',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 7b',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Create root comment with anchor (required for replies)
    const rootCommentResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Root comment to be quoted',
          anchor: {
            type: 'image_point',
            x: 0.5,
            y: 0.5,
          },
        },
      },
    )

    if (!rootCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }

    const rootCommentId = rootCommentResponse.data.comment.id

    // Create reply quoting the root comment
    const quotedReplyResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Reply quoting root comment',
          quoteId: rootCommentId,
          rootCommentId,
        },
      },
    )

    expect(quotedReplyResponse.response.status).toBe(201)
    if (!quotedReplyResponse.data?.comment.id) {
      throw new Error('No response data received')
    }
    expect(quotedReplyResponse.data.comment.content).toBe(
      'Reply quoting root comment',
    )
    expect(quotedReplyResponse.data.comment.rootId).toBe(rootCommentId)
    expect(quotedReplyResponse.data.comment.quoteId).toBe(rootCommentId)
    expect(quotedReplyResponse.data.comment.quotedComment).toBeDefined()
    if (!quotedReplyResponse.data.comment.quotedComment) {
      throw new Error('Quoted comment should be defined')
    }
    expect(quotedReplyResponse.data.comment.quotedComment.content).toBe(
      'Root comment to be quoted',
    )
    expect(quotedReplyResponse.data.comment.quotedComment.id).toBe(
      rootCommentId,
    )
  })

  it('should get a full comment thread', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser8',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 8',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Create root comment with anchor (required for replies)
    const rootCommentResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Root comment',
          anchor: {
            type: 'image_point',
            x: 0.5,
            y: 0.5,
          },
        },
      },
    )

    if (!rootCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }

    const rootCommentId = rootCommentResponse.data.comment.id

    // Create multiple replies
    await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'First reply',
          rootCommentId,
        },
      },
    )

    await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Second reply',
          rootCommentId,
        },
      },
    )

    // Get thread
    const threadResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{rootId}/thread',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
            rootId: rootCommentId,
          },
        },
      },
    )

    expect(threadResponse.response.status).toBe(200)
    expect(threadResponse.data).toBeDefined()
    if (!threadResponse.data) {
      throw new Error('No response data received')
    }
    expect(threadResponse.data.comments.length).toBe(3) // Root + 2 replies
    // Should be ordered chronologically (oldest first)
    expect(threadResponse.data.comments[0]?.content).toBe('Root comment')
    expect(threadResponse.data.comments[1]?.content).toBe('First reply')
    expect(threadResponse.data.comments[2]?.content).toBe('Second reply')
    // All should have authors
    threadResponse.data.comments.forEach((comment) => {
      expect(comment.author).toBeDefined()
      expect(comment.author.username).toBe('testuser8')
    })
  })

  it('should delete a comment (soft delete)', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser9',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 9',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Create root comment
    const rootCommentResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Root comment to delete',
        },
      },
    )

    if (!rootCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }

    const rootCommentId = rootCommentResponse.data.comment.id

    // Verify comment exists
    const listBeforeDelete = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
      },
    )

    if (!listBeforeDelete.data) {
      throw new Error('No response data received')
    }
    expect(listBeforeDelete.data.comments.length).toBe(1)

    // Delete comment
    const deleteResponse = await apiClient(accessToken).DELETE(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{commentId}',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
            commentId: rootCommentId,
          },
        },
      },
    )

    expect(deleteResponse.response.status).toBe(200)
    expect(deleteResponse.data).toBeDefined()
    if (!deleteResponse.data) {
      throw new Error('No response data received')
    }
    expect(deleteResponse.data.success).toBe(true)

    // Verify comment is soft deleted (should not appear in list)
    const listAfterDelete = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
      },
    )

    if (!listAfterDelete.data) {
      throw new Error('No response data received')
    }
    expect(listAfterDelete.data.comments.length).toBe(0)
  })

  it('should fail to create reply with quote from different thread', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser10',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 10',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Create two root comments
    const rootComment1Response = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Root comment 1',
        },
      },
    )

    const rootComment2Response = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Root comment 2',
          anchor: {
            type: 'image_point',
            x: 0.5,
            y: 0.5,
          },
        },
      },
    )

    if (
      !rootComment1Response.data?.comment.id ||
      !rootComment2Response.data?.comment.id
    ) {
      throw new Error('No response data received')
    }

    const rootComment1Id = rootComment1Response.data.comment.id
    const rootComment2Id = rootComment2Response.data.comment.id

    // Try to create reply in thread 2 quoting comment from thread 1
    const invalidReplyResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Reply trying to quote from different thread',
          quoteId: rootComment1Id,
          rootCommentId: rootComment2Id,
        },
      },
    )

    expect(invalidReplyResponse.response.status).toBe(400)
  })

  it('should fail to create reply to root comment without anchor', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser_anchor_constraint',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 11',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Create root comment WITHOUT anchor
    const rootCommentResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Root comment without anchor',
        },
      },
    )

    if (!rootCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }

    const rootCommentId = rootCommentResponse.data.comment.id

    // Try to create reply to root comment without anchor - should fail
    const invalidReplyResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'This reply should fail',
          rootCommentId,
        },
      },
    )

    // Application-level validation should return 400 error
    expect(invalidReplyResponse.response.status).toBe(400)

    // Create root comment WITH anchor
    const rootCommentWithAnchorResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Root comment with anchor',
          anchor: {
            type: 'image_point',
            x: 0.5,
            y: 0.5,
          },
        },
      },
    )

    if (!rootCommentWithAnchorResponse.data?.comment.id) {
      throw new Error('No response data received')
    }

    const rootCommentWithAnchorId =
      rootCommentWithAnchorResponse.data.comment.id

    // Create reply to root comment with anchor - should succeed
    const validReplyResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'This reply should succeed',
          rootCommentId: rootCommentWithAnchorId,
        },
      },
    )

    expect(validReplyResponse.response.status).toBe(201)
    if (!validReplyResponse.data?.comment.id) {
      throw new Error('No response data received')
    }
    expect(validReplyResponse.data.comment.content).toBe(
      'This reply should succeed',
    )
    expect(validReplyResponse.data.comment.rootId).toBe(rootCommentWithAnchorId)
  })

  it('should fail to delete comment that does not belong to user', async () => {
    const {
      session: { accessToken: accessToken1 },
    } = await createTestUser(testModule!, {
      username: 'testuser11',
      password: '123',
    })

    const {
      session: { accessToken: accessToken2 },
    } = await createTestUser(testModule!, {
      username: 'testuser12',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 11',
      testModule,
      accessToken: accessToken1,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken: accessToken1,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken1).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Create comment as user 1
    const rootCommentResponse = await apiClient(accessToken1).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Comment by user 1',
        },
      },
    )

    if (!rootCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }

    const rootCommentId = rootCommentResponse.data.comment.id

    // Try to delete as user 2
    const deleteResponse = await apiClient(accessToken2).DELETE(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{commentId}',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
            commentId: rootCommentId,
          },
        },
      },
    )

    expect(deleteResponse.response.status).toBe(404)
  })

  it('should validate anchor coordinates for image_point', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser13',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 13',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Try to create comment with invalid x coordinate (> 1)
    const invalidResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Comment with invalid anchor',
          anchor: {
            type: 'image_point',
            x: 1.5, // Invalid: > 1
            y: 0.5,
          },
        },
      },
    )

    expect(invalidResponse.response.status).toBe(400)
  })

  it('should validate anchor time for video_point', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser14',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 14',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.mp4', content: 'test video content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Try to create comment with negative time
    const invalidResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Comment with invalid anchor',
          anchor: {
            type: 'video_point',
            t: -10, // Invalid: negative
          },
        },
      },
    )

    expect(invalidResponse.response.status).toBe(400)
  })

  it('should prevent creating root comment without folder access', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'folderowner',
      password: '123',
    })

    const {
      session: { accessToken: unauthorizedToken },
    } = await createTestUser(testModule!, {
      username: 'unauthorizeduser',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Private Folder',
      testModule,
      accessToken: ownerToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken: ownerToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(ownerToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Unauthorized user tries to create comment
    const createCommentResponse = await apiClient(unauthorizedToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Unauthorized comment',
        },
      },
    )

    // Should return 404 (folder not found for this user)
    expect(createCommentResponse.response.status).toBe(404)
  })

  it('should prevent listing comments without folder access', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'folderowner2',
      password: '123',
    })

    const {
      session: { accessToken: unauthorizedToken },
    } = await createTestUser(testModule!, {
      username: 'unauthorizeduser2',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Private Folder 2',
      testModule,
      accessToken: ownerToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken: ownerToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(ownerToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Owner creates a comment
    await apiClient(ownerToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Owner comment',
        },
      },
    )

    // Unauthorized user tries to list comments
    const listCommentsResponse = await apiClient(unauthorizedToken).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
      },
    )

    // Should return 404 (folder not found for this user)
    expect(listCommentsResponse.response.status).toBe(404)
  })

  it('should prevent getting thread without folder access', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'folderowner3',
      password: '123',
    })

    const {
      session: { accessToken: unauthorizedToken },
    } = await createTestUser(testModule!, {
      username: 'unauthorizeduser3',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Private Folder 3',
      testModule,
      accessToken: ownerToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken: ownerToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(ownerToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Owner creates a root comment
    const rootCommentResponse = await apiClient(ownerToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Owner root comment',
        },
      },
    )

    if (!rootCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }

    const rootCommentId = rootCommentResponse.data.comment.id

    // Unauthorized user tries to get thread
    const threadResponse = await apiClient(unauthorizedToken).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{rootId}/thread',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
            rootId: rootCommentId,
          },
        },
      },
    )

    // Should return 404 (folder not found for this user)
    expect(threadResponse.response.status).toBe(404)
  })

  it('should allow creating comment with shared folder access', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'folderowner4',
      password: '123',
    })

    const {
      session: { accessToken: sharedUserToken },
    } = await createTestUser(testModule!, {
      username: 'shareduser',
      password: '123',
    })

    const sharedUser = await apiClient(sharedUserToken).GET('/api/v1/viewer')

    if (!sharedUser.data) {
      throw new Error('Failed to get shared user')
    }

    const testFolder = await createTestFolder({
      folderName: 'Shared Folder',
      testModule,
      accessToken: ownerToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken: ownerToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    // Share folder with user
    await apiClient(ownerToken).POST(
      '/api/v1/folders/{folderId}/shares/{userId}',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            userId: sharedUser.data.user.id,
          },
        },
        body: {
          permissions: ['OBJECT_EDIT'],
        },
      },
    )

    const listObjectsResponse = await apiClient(sharedUserToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Shared user creates a comment
    const createCommentResponse = await apiClient(sharedUserToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Comment from shared user',
        },
      },
    )

    expect(createCommentResponse.response.status).toBe(201)
    if (!createCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }
    expect(createCommentResponse.data.comment.content).toBe(
      'Comment from shared user',
    )
    expect(createCommentResponse.data.comment.author.username).toBe(
      'shareduser',
    )
  })

  it('should allow viewing comments with shared folder access', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'folderowner5',
      password: '123',
    })

    const {
      session: { accessToken: sharedUserToken },
    } = await createTestUser(testModule!, {
      username: 'shareduser2',
      password: '123',
    })

    const sharedUser = await apiClient(sharedUserToken).GET('/api/v1/viewer')

    if (!sharedUser.data) {
      throw new Error('Failed to get shared user')
    }

    const testFolder = await createTestFolder({
      folderName: 'Shared Folder 2',
      testModule,
      accessToken: ownerToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken: ownerToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    // Share folder with user
    await apiClient(ownerToken).POST(
      '/api/v1/folders/{folderId}/shares/{userId}',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            userId: sharedUser.data.user.id,
          },
        },
        body: {
          permissions: ['OBJECT_EDIT'],
        },
      },
    )

    const listObjectsResponse = await apiClient(ownerToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Owner creates a comment
    const rootCommentResponse = await apiClient(ownerToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Owner comment',
        },
      },
    )

    if (!rootCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }

    const rootCommentId = rootCommentResponse.data.comment.id

    // Shared user lists comments
    const listCommentsResponse = await apiClient(sharedUserToken).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
      },
    )

    expect(listCommentsResponse.response.status).toBe(200)
    if (!listCommentsResponse.data) {
      throw new Error('No response data received')
    }
    expect(listCommentsResponse.data.comments.length).toBe(1)
    expect(listCommentsResponse.data.comments[0]?.content).toBe('Owner comment')

    // Shared user gets thread
    const threadResponse = await apiClient(sharedUserToken).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{rootId}/thread',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
            rootId: rootCommentId,
          },
        },
      },
    )

    expect(threadResponse.response.status).toBe(200)
    if (!threadResponse.data) {
      throw new Error('No response data received')
    }
    expect(threadResponse.data.comments.length).toBe(1)
    expect(threadResponse.data.comments[0]?.content).toBe('Owner comment')
  })

  it('should list all comments for a folder object', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser11',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 11',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Create first root comment with anchor (required for replies)
    const rootComment1Response = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'First root comment',
          anchor: {
            type: 'image_point',
            x: 0.5,
            y: 0.5,
          },
        },
      },
    )

    if (!rootComment1Response.data?.comment.id) {
      throw new Error('No response data received')
    }

    const rootComment1Id = rootComment1Response.data.comment.id

    // Create second root comment
    const rootComment2Response = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Second root comment',
        },
      },
    )

    if (!rootComment2Response.data?.comment.id) {
      throw new Error('No response data received')
    }

    // Create reply to first root comment
    const reply1Response = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Reply to first root',
          rootCommentId: rootComment1Id,
        },
      },
    )

    if (!reply1Response.data?.comment.id) {
      throw new Error('No response data received')
    }

    // Create reply with quote
    const reply2Response = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Reply quoting first root',
          quoteId: rootComment1Id,
          rootCommentId: rootComment1Id,
        },
      },
    )

    if (!reply2Response.data?.comment.id) {
      throw new Error('No response data received')
    }

    // List all comments
    const allCommentsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
      },
    )

    expect(allCommentsResponse.response.status).toBe(200)
    if (!allCommentsResponse.data) {
      throw new Error('No response data received')
    }
    expect(allCommentsResponse.data.comments.length).toBe(4) // 2 root + 2 replies
    // Should be ordered chronologically (oldest first)
    expect(allCommentsResponse.data.comments[0]?.content).toBe(
      'First root comment',
    )
    expect(allCommentsResponse.data.comments[0]?.rootId).toBeNull()
    expect(allCommentsResponse.data.comments[1]?.content).toBe(
      'Second root comment',
    )
    expect(allCommentsResponse.data.comments[1]?.rootId).toBeNull()
    expect(allCommentsResponse.data.comments[2]?.content).toBe(
      'Reply to first root',
    )
    expect(allCommentsResponse.data.comments[2]?.rootId).toBe(rootComment1Id)
    expect(allCommentsResponse.data.comments[3]?.content).toBe(
      'Reply quoting first root',
    )
    expect(allCommentsResponse.data.comments[3]?.rootId).toBe(rootComment1Id)
    expect(allCommentsResponse.data.comments[3]?.quoteId).toBe(rootComment1Id)
    expect(allCommentsResponse.data.comments[3]?.quotedComment).toBeDefined()
    if (!allCommentsResponse.data.comments[3]?.quotedComment) {
      throw new Error('Quoted comment should be defined')
    }
    expect(allCommentsResponse.data.comments[3].quotedComment.content).toBe(
      'First root comment',
    )

    // All comments should have authors
    allCommentsResponse.data.comments.forEach((comment) => {
      expect(comment.author).toBeDefined()
      expect(comment.author.username).toBe('testuser11')
    })
  })

  it('should exclude deleted comments from all comments list', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser12',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 12',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Create root comment with anchor (required for replies)
    const rootCommentResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Root comment',
          anchor: {
            type: 'image_point',
            x: 0.5,
            y: 0.5,
          },
        },
      },
    )

    if (!rootCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }

    const rootCommentId = rootCommentResponse.data.comment.id

    // Create reply
    const replyResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Reply to delete',
          rootCommentId,
        },
      },
    )

    if (!replyResponse.data?.comment.id) {
      throw new Error('No response data received')
    }

    const replyId = replyResponse.data.comment.id

    // Delete the reply
    await apiClient(accessToken).DELETE(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{commentId}',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
            commentId: replyId,
          },
        },
      },
    )

    // List all comments - should only include root comment
    const allCommentsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
      },
    )

    expect(allCommentsResponse.response.status).toBe(200)
    if (!allCommentsResponse.data) {
      throw new Error('No response data received')
    }
    expect(allCommentsResponse.data.comments.length).toBe(1)
    expect(allCommentsResponse.data.comments[0]?.id).toBe(rootCommentId)
    expect(allCommentsResponse.data.comments[0]?.content).toBe('Root comment')
  })

  it('should prevent listing all comments without folder access', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'testuser13_owner',
      password: '123',
    })

    const {
      session: { accessToken: unauthorizedToken },
    } = await createTestUser(testModule!, {
      username: 'testuser13_unauthorized',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 13',
      testModule,
      accessToken: ownerToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken: ownerToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(ownerToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Owner creates a comment
    await apiClient(ownerToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Owner comment',
        },
      },
    )

    // Unauthorized user tries to list all comments
    const allCommentsResponse = await apiClient(unauthorizedToken).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
      },
    )

    // Should return 404 (folder not found for this user)
    expect(allCommentsResponse.response.status).toBe(404)
  })

  it('should allow listing all comments with folder access', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'testuser14_owner',
      password: '123',
    })

    const {
      session: { accessToken: sharedUserToken },
    } = await createTestUser(testModule!, {
      username: 'testuser14_shared',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Comments Test Folder 14',
      testModule,
      accessToken: ownerToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    const sharedUser = await apiClient(sharedUserToken).GET('/api/v1/viewer')

    if (!sharedUser.data) {
      throw new Error('Failed to get shared user')
    }

    // Share folder with OBJECT_EDIT permission
    await apiClient(ownerToken).POST(
      '/api/v1/folders/{folderId}/shares/{userId}',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            userId: sharedUser.data.user.id,
          },
        },
        body: {
          permissions: ['OBJECT_EDIT'],
        },
      },
    )

    await reindexTestFolder({
      accessToken: ownerToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(ownerToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Owner creates a comment
    await apiClient(ownerToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Owner comment',
        },
      },
    )

    // Shared user lists all comments
    const allCommentsResponse = await apiClient(sharedUserToken).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
      },
    )

    expect(allCommentsResponse.response.status).toBe(200)
    if (!allCommentsResponse.data) {
      throw new Error('No response data received')
    }
    expect(allCommentsResponse.data.comments.length).toBe(1)
    expect(allCommentsResponse.data.comments[0]?.content).toBe('Owner comment')
  })

  it('should create comment with mentions and parse @username patterns', async () => {
    const {
      session: { accessToken: user1Token },
    } = await createTestUser(testModule!, {
      username: 'testuser_mention1',
      password: '123',
    })

    // Create the user that will be mentioned
    await createTestUser(testModule!, {
      username: 'testuser_mention2',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Mentions Test Folder',
      testModule,
      accessToken: user1Token,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken: user1Token,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(user1Token).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Create comment with mentions
    const createCommentResponse = await apiClient(user1Token).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Hey @testuser_mention2, check this out!',
        },
      },
    )

    expect(createCommentResponse.response.status).toBe(201)
    if (!createCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }

    const commentId = createCommentResponse.data.comment.id

    // Fetch comment and verify mentions
    const listCommentsResponse = await apiClient(user1Token).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
      },
    )

    expect(listCommentsResponse.response.status).toBe(200)
    if (!listCommentsResponse.data) {
      throw new Error('No response data received')
    }

    const comment = listCommentsResponse.data.comments.find(
      (c) => c.id === commentId,
    )
    expect(comment).toBeDefined()
    expect(comment?.mentions).toBeDefined()
    expect(comment?.mentions?.length).toBe(1)
    expect(comment?.mentions?.[0]?.username).toBe('testuser_mention2')
  })

  it('should add and remove reactions to comments', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser_reactions',
      password: '123',
    })

    const testFolder = await createTestFolder({
      folderName: 'Reactions Test Folder',
      testModule,
      accessToken,
      mockFiles: [{ objectKey: 'test.jpg', content: 'test image content' }],
      apiClient,
    })

    await reindexTestFolder({
      accessToken,
      apiClient,
      folderId: testFolder.folder.id,
    })

    await testModule!.waitForTasks('completed')

    const listObjectsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      {
        params: { path: { folderId: testFolder.folder.id } },
      },
    )

    if (!listObjectsResponse.data) {
      throw new Error('No response data received')
    }

    const folderObject = listObjectsResponse.data.result[0]
    if (!folderObject) {
      throw new Error('No folder object found')
    }

    // Create comment with anchor (required for reactions in threads)
    const createCommentResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
        body: {
          content: 'Test comment for reactions',
          anchor: {
            type: 'image_point',
            x: 0.5,
            y: 0.5,
          },
        },
      },
    )

    expect(createCommentResponse.response.status).toBe(201)
    if (!createCommentResponse.data?.comment.id) {
      throw new Error('No response data received')
    }

    const commentId = createCommentResponse.data.comment.id

    // Add reaction
    const addReactionResponse = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{commentId}/reactions',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
            commentId,
          },
        },
        body: {
          emoji: '👍',
        },
      },
    )

    expect(addReactionResponse.response.status).toBe(201)

    // Verify reaction appears in comment
    const listCommentsResponse = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
      },
    )

    expect(listCommentsResponse.response.status).toBe(200)
    if (!listCommentsResponse.data) {
      throw new Error('No response data received')
    }

    const comment = listCommentsResponse.data.comments.find(
      (c) => c.id === commentId,
    )
    expect(comment).toBeDefined()
    expect(comment?.reactions).toBeDefined()
    expect(comment?.reactions?.length).toBe(1)
    expect(comment?.reactions?.[0]?.emoji).toBe('👍')
    expect(comment?.reactions?.[0]?.count).toBe(1)

    // Remove reaction
    const removeReactionResponse = await apiClient(accessToken).DELETE(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{commentId}/reactions/{emoji}',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
            commentId,
            emoji: encodeURIComponent('👍'),
          },
        },
      },
    )

    expect(removeReactionResponse.response.status).toBe(200)

    // Verify reaction is removed
    const listCommentsResponse2 = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: {
          path: {
            folderId: testFolder.folder.id,
            folderObjectId: folderObject.id,
          },
        },
      },
    )

    expect(listCommentsResponse2.response.status).toBe(200)
    if (!listCommentsResponse2.data) {
      throw new Error('No response data received')
    }

    const comment2 = listCommentsResponse2.data.comments.find(
      (c) => c.id === commentId,
    )
    expect(comment2).toBeDefined()
    expect(comment2?.reactions?.length).toBe(0)
  })
})
