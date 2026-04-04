import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { CoreTaskName } from 'src/task/task.constants'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
  reindexTestFolder,
} from 'src/test/test.util'

const TEST_MODULE_KEY = 'comment_threads'

describe('Comment Threads & Reactions', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
    testModule?.cleanupMinioTestBuckets()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  async function setupFolderWithObject(accessToken: string) {
    await testModule!.setServerStorageLocation()
    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'CommentTestFolder',
      mockFiles: [{ objectKey: 'test-file.txt', content: 'hello' }],
    })
    await reindexTestFolder({ accessToken, apiClient, folderId: folder.id })
    await testModule!.waitForTasks('completed', {
      taskIdentifiers: [CoreTaskName.ReindexFolder],
    })
    const objectsRes = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects',
      { params: { path: { folderId: folder.id } } },
    )
    const folderObjectId = objectsRes.data!.result[0]!.id
    return { folder, folderObjectId }
  }

  it('should get a comment thread', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'threaduser',
      password: '123',
    })

    const { folder, folderObjectId } = await setupFolderWithObject(accessToken)

    // Create root comment with anchor (required for thread replies)
    const rootRes = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: { path: { folderId: folder.id, folderObjectId } },
        body: {
          content: 'Root comment',
          anchor: { type: 'image_point', x: 0.5, y: 0.5 },
        },
      },
    )
    expect([200, 201]).toContain(rootRes.response.status)
    const rootId = rootRes.data!.comment.id

    // Create reply in thread
    const replyRes = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: { path: { folderId: folder.id, folderObjectId } },
        body: { content: 'Reply comment', rootCommentId: rootId },
      },
    )
    expect([200, 201]).toContain(replyRes.response.status)

    // Get thread
    const threadRes = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{rootId}/thread',
      {
        params: {
          path: { folderId: folder.id, folderObjectId, rootId },
        },
      },
    )
    expect(threadRes.response.status).toBe(200)
    expect(threadRes.data!.comments.length).toBeGreaterThanOrEqual(2)
  })

  it('should delete own comment', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'deluser',
      password: '123',
    })

    const { folder, folderObjectId } = await setupFolderWithObject(accessToken)

    const createRes = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: { path: { folderId: folder.id, folderObjectId } },
        body: { content: 'To be deleted' },
      },
    )
    expect([200, 201]).toContain(createRes.response.status)
    const commentId = createRes.data!.comment.id

    const deleteRes = await apiClient(accessToken).DELETE(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{commentId}',
      {
        params: {
          path: { folderId: folder.id, folderObjectId, commentId },
        },
      },
    )
    expect(deleteRes.response.status).toBe(200)
    expect(deleteRes.data?.success).toBe(true)
  })

  it('should add and remove a reaction', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'reactuser',
      password: '123',
    })

    const { folder, folderObjectId } = await setupFolderWithObject(accessToken)

    const createRes = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      {
        params: { path: { folderId: folder.id, folderObjectId } },
        body: { content: 'React to this' },
      },
    )
    const commentId = createRes.data!.comment.id

    // Add reaction
    const addRes = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{commentId}/reactions',
      {
        params: {
          path: { folderId: folder.id, folderObjectId, commentId },
        },
        body: { emoji: '👍' },
      },
    )
    expect([200, 201]).toContain(addRes.response.status)
    expect(addRes.data?.success).toBe(true)

    // Verify reaction appears in comment list
    const listRes = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments',
      { params: { path: { folderId: folder.id, folderObjectId } } },
    )
    const comment = listRes.data!.comments.find((c) => c.id === commentId)
    expect(comment?.reactions?.length).toBeGreaterThanOrEqual(1)

    // Remove reaction
    const removeRes = await apiClient(accessToken).DELETE(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{commentId}/reactions/{emoji}',
      {
        params: {
          path: {
            folderId: folder.id,
            folderObjectId,
            commentId,
            emoji: '👍',
          },
        },
      },
    )
    expect(removeRes.response.status).toBe(200)
  })

  it('should require authentication for thread endpoint', async () => {
    const res = await apiClient().GET(
      '/api/v1/folders/{folderId}/objects/{folderObjectId}/comments/{rootId}/thread',
      {
        params: {
          path: {
            folderId: '00000000-0000-0000-0000-000000000000',
            folderObjectId: '00000000-0000-0000-0000-000000000000',
            rootId: '00000000-0000-0000-0000-000000000000',
          },
        },
      },
    )
    expect(res.response.status).toBe(401)
  })
})
