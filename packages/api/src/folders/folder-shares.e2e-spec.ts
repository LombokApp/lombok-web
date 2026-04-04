import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'

const TEST_MODULE_KEY = 'folder_shares'

describe('Folder Shares Management', () => {
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

  async function getViewerUserId(accessToken: string) {
    const res = await apiClient(accessToken).GET('/api/v1/viewer')
    return res.data!.user.id
  }

  it('should list shares for a folder (initially empty)', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'shareowner',
      password: '123',
    })

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'ShareFolder',
    })

    const res = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/shares',
      { params: { path: { folderId: folder.id } } },
    )
    expect(res.response.status).toBe(200)
    expect(res.data?.result).toBeArray()
  })

  it('should create, get, and remove a folder share', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'shareowner2',
      password: '123',
    })

    const {
      session: { accessToken: shareTarget },
    } = await createTestUser(testModule!, {
      username: 'sharetarget',
      password: '123',
    })

    const targetUserId = await getViewerUserId(shareTarget)

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken: ownerToken,
      apiClient,
      folderName: 'ShareCrudFolder',
    })

    // Create share
    const createRes = await apiClient(ownerToken).POST(
      '/api/v1/folders/{folderId}/shares/{userId}',
      {
        params: { path: { folderId: folder.id, userId: targetUserId } },
        body: { permissions: ['OBJECT_EDIT'] },
      },
    )
    expect([200, 201]).toContain(createRes.response.status)
    expect(createRes.data?.share).toBeDefined()

    // Get the share
    const getRes = await apiClient(ownerToken).GET(
      '/api/v1/folders/{folderId}/shares/{userId}',
      {
        params: { path: { folderId: folder.id, userId: targetUserId } },
      },
    )
    expect(getRes.response.status).toBe(200)
    expect(getRes.data?.share).toBeDefined()

    // List shares - should have 1
    const listRes = await apiClient(ownerToken).GET(
      '/api/v1/folders/{folderId}/shares',
      { params: { path: { folderId: folder.id } } },
    )
    expect(listRes.response.status).toBe(200)
    expect(listRes.data!.result.length).toBeGreaterThanOrEqual(1)

    // Remove share
    const removeRes = await apiClient(ownerToken).DELETE(
      '/api/v1/folders/{folderId}/shares/{userId}',
      {
        params: { path: { folderId: folder.id, userId: targetUserId } },
      },
    )
    expect(removeRes.response.status).toBe(200)
  })

  it('should list user share options', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'optowner',
      password: '123',
    })

    await createTestUser(testModule!, {
      username: 'optcandidate',
      password: '123',
    })

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'OptFolder',
    })

    const res = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/user-share-options',
      { params: { path: { folderId: folder.id } } },
    )
    expect(res.response.status).toBe(200)
    expect(res.data?.result).toBeArray()
  })

  it('should require authentication for share endpoints', async () => {
    const folderId = '00000000-0000-0000-0000-000000000000'
    const userId = '00000000-0000-0000-0000-000000000000'

    const listRes = await apiClient().GET(
      '/api/v1/folders/{folderId}/shares',
      { params: { path: { folderId } } },
    )
    expect(listRes.response.status).toBe(401)

    const getRes = await apiClient().GET(
      '/api/v1/folders/{folderId}/shares/{userId}',
      { params: { path: { folderId, userId } } },
    )
    expect(getRes.response.status).toBe(401)
  })
})
