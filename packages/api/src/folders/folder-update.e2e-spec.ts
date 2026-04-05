import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'

const TEST_MODULE_KEY = 'folder_update'

describe('Folder Update (Rename)', () => {
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

  it('should require authentication', async () => {
    const res = await apiClient().PUT('/api/v1/folders/{folderId}', {
      params: {
        path: { folderId: '00000000-0000-0000-0000-000000000000' },
      },
      body: { name: 'NewName' },
    })
    expect(res.response.status).toBe(401)
  })

  it('should rename an owned folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'renameuser',
      password: '123',
    })

    await testModule!.setServerStorageLocation()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'OriginalName',
      mockFiles: [],
    })

    const res = await apiClient(accessToken).PUT('/api/v1/folders/{folderId}', {
      params: { path: { folderId: folder.id } },
      body: { name: 'RenamedFolder' },
    })
    expect([200, 201]).toContain(res.response.status)
    expect(res.data?.folder).toBeDefined()
    expect(res.data!.folder.name).toBe('RenamedFolder')
  })

  it('should persist the rename', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'persistrn',
      password: '123',
    })

    await testModule!.setServerStorageLocation()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'BeforeRename',
      mockFiles: [],
    })

    await apiClient(accessToken).PUT('/api/v1/folders/{folderId}', {
      params: { path: { folderId: folder.id } },
      body: { name: 'AfterRename' },
    })

    const getRes = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}',
      { params: { path: { folderId: folder.id } } },
    )
    expect(getRes.response.status).toBe(200)
    expect(getRes.data?.folder.name).toBe('AfterRename')
  })

  it('should not allow non-owner to rename', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'rnowner',
      password: '123',
    })

    const {
      session: { accessToken: otherToken },
    } = await createTestUser(testModule!, {
      username: 'rnother',
      password: '123',
    })

    await testModule!.setServerStorageLocation()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken: ownerToken,
      apiClient,
      folderName: 'ProtectedFolder',
      mockFiles: [],
    })

    const res = await apiClient(otherToken).PUT('/api/v1/folders/{folderId}', {
      params: { path: { folderId: folder.id } },
      body: { name: 'Hacked' },
    })
    expect([401, 403, 404]).toContain(res.response.status)
  })
})
