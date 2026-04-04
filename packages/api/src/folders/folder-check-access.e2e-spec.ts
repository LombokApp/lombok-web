import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { v4 as uuidV4 } from 'uuid'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'

const TEST_MODULE_KEY = 'folder_chk_acc'

describe('Folder Check Access', () => {
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

  it('should check access on owned folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'chkacc',
      password: '123',
    })

    await testModule!.setServerStorageLocation()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'CheckAccessFolder',
      mockFiles: [],
    })

    const res = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/check-access',
      { params: { path: { folderId: folder.id } } },
    )
    expect([200, 201]).toContain(res.response.status)
  })

  it('should deny access on non-owned folder', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'chkowner',
      password: '123',
    })

    const {
      session: { accessToken: otherToken },
    } = await createTestUser(testModule!, {
      username: 'chkother',
      password: '123',
    })

    await testModule!.setServerStorageLocation()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken: ownerToken,
      apiClient,
      folderName: 'ProtectedCheck',
      mockFiles: [],
    })

    const res = await apiClient(otherToken).POST(
      '/api/v1/folders/{folderId}/check-access',
      { params: { path: { folderId: folder.id } } },
    )
    expect([401, 403, 404]).toContain(res.response.status)
  })

  it('should return error for non-existent folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'chk404',
      password: '123',
    })

    const res = await apiClient(accessToken).POST(
      '/api/v1/folders/{folderId}/check-access',
      { params: { path: { folderId: uuidV4() } } },
    )
    expect([404, 400, 401, 403]).toContain(res.response.status)
  })
})
