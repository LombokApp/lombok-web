import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { v4 as uuidV4 } from 'uuid'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
  reindexTestFolder,
} from 'src/test/test.util'

const TEST_MODULE_KEY = 'folder_metadata'

describe('Folder Metadata & Check Access', () => {
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

  it('should require authentication for metadata endpoint', async () => {
    const res = await apiClient().GET(
      '/api/v1/folders/{folderId}/metadata',
      {
        params: {
          path: { folderId: '00000000-0000-0000-0000-000000000000' },
        },
      },
    )
    expect(res.response.status).toBe(401)
  })

  it('should get folder metadata for owned folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'metauser',
      password: '123',
    })

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'MetadataFolder',
    })

    const res = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/metadata',
      { params: { path: { folderId: folder.id } } },
    )
    expect(res.response.status).toBe(200)
    expect(res.data).toBeDefined()
  })

  it('should not return metadata for non-existent folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'metamisser',
      password: '123',
    })

    const res = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/metadata',
      { params: { path: { folderId: uuidV4() } } },
    )
    expect([403, 404]).toContain(res.response.status)
  })

  it('should check folder access for owner', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'checkuser',
      password: '123',
    })

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'CheckAccessFolder',
    })

    const res = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/check-access',
      { params: { path: { folderId: folder.id } } },
    )
    expect([200, 201]).toContain(res.response.status)
    expect(res.data?.ok).toBe(true)
  })

  it('should deny check-access for non-owner', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'checkowner',
      password: '123',
    })

    const {
      session: { accessToken: otherToken },
    } = await createTestUser(testModule!, {
      username: 'checkother',
      password: '123',
    })

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken: ownerToken,
      apiClient,
      folderName: 'DenyCheckFolder',
    })

    const res = await apiClient(otherToken).POST(
      '/api/v1/folders/{folderId}/check-access',
      { params: { path: { folderId: folder.id } } },
    )
    expect([401, 403, 404]).toContain(res.response.status)
  })

  it('should require authentication for check-access', async () => {
    const res = await apiClient().POST(
      '/api/v1/folders/{folderId}/check-access',
      {
        params: {
          path: { folderId: '00000000-0000-0000-0000-000000000000' },
        },
      },
    )
    expect(res.response.status).toBe(401)
  })
})
