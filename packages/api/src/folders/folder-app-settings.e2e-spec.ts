import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'
import { v4 as uuidV4 } from 'uuid'

const TEST_MODULE_KEY = 'folder_appsett'

describe('Folder App Settings', () => {
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

  it('should require authentication for app-settings', async () => {
    const res = await apiClient().GET(
      '/api/v1/folders/{folderId}/app-settings',
      {
        params: {
          path: { folderId: '00000000-0000-0000-0000-000000000000' },
        },
      },
    )
    expect(res.response.status).toBe(401)
  })

  it('should get app settings for owned folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'appsettuser',
      password: '123',
    })

    await testModule!.setServerStorageLocation()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'AppSettingsFolder',
      mockFiles: [],
    })

    const res = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/app-settings',
      { params: { path: { folderId: folder.id } } },
    )
    expect(res.response.status).toBe(200)
    expect(res.data?.settings).toBeDefined()
  })

  it('should not allow app settings for non-owned folder', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'appsettowner',
      password: '123',
    })

    const {
      session: { accessToken: otherToken },
    } = await createTestUser(testModule!, {
      username: 'appsettother',
      password: '123',
    })

    await testModule!.setServerStorageLocation()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken: ownerToken,
      apiClient,
      folderName: 'AppSettProtected',
      mockFiles: [],
    })

    const res = await apiClient(otherToken).GET(
      '/api/v1/folders/{folderId}/app-settings',
      { params: { path: { folderId: folder.id } } },
    )
    expect([401, 403, 404]).toContain(res.response.status)
  })

  it('should return error for non-existent folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'appsettmissing',
      password: '123',
    })

    const res = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/app-settings',
      { params: { path: { folderId: uuidV4() } } },
    )
    expect([403, 404]).toContain(res.response.status)
  })
})
