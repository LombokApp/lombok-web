import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { LogEntryLevel } from '@lombokapp/types'
import { v4 as uuidV4 } from 'uuid'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'
import { logEntriesTable } from './entities/log-entry.entity'

const TEST_MODULE_KEY = 'folder_logs'

async function seedFolderLogEntry(
  testModule: TestModule,
  folderId: string,
  overrides: Partial<typeof logEntriesTable.$inferInsert> = {},
) {
  const id = uuidV4()
  const now = new Date()

  await testModule.services.ormService.db.insert(logEntriesTable).values({
    id,
    message: 'Test folder log',
    emitterIdentifier: 'core',
    level: LogEntryLevel.INFO,
    targetLocationFolderId: folderId,
    createdAt: now,
    ...overrides,
  })

  return { id }
}

describe('Folder Logs', () => {
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
    const response = await apiClient().GET(
      '/api/v1/folders/{folderId}/logs',
      { params: { path: { folderId: uuidV4() } } },
    )
    expect(response.response.status).toEqual(401)
  })

  it('should list logs for a folder the user owns', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'folderloguser',
      password: '123',
    })

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'LogTestFolder',
    })

    await seedFolderLogEntry(testModule!, folder.id, { message: 'Action 1' })
    await seedFolderLogEntry(testModule!, folder.id, { message: 'Action 2' })

    const response = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/logs',
      { params: { path: { folderId: folder.id } } },
    )
    expect(response.response.status).toEqual(200)
    expect(response.data?.result).toBeArray()
    expect(response.data?.result.length).toEqual(2)
    expect(response.data?.meta.totalCount).toEqual(2)
  })

  it('should get a single folder log entry by ID', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'folderlogget',
      password: '123',
    })

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'LogGetFolder',
    })

    const { id: logId } = await seedFolderLogEntry(testModule!, folder.id, {
      message: 'Specific folder log',
      level: LogEntryLevel.ERROR,
    })

    const response = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/logs/{logId}',
      { params: { path: { folderId: folder.id, logId } } },
    )
    expect(response.response.status).toEqual(200)
    expect(response.data?.log.message).toEqual('Specific folder log')
    expect(response.data?.log.level).toEqual(LogEntryLevel.ERROR)
  })

  it('should not list logs for a folder the user does not own', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'logowner',
      password: '123',
    })

    const {
      session: { accessToken: otherToken },
    } = await createTestUser(testModule!, {
      username: 'logother',
      password: '123',
    })

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken: ownerToken,
      apiClient,
      folderName: 'PrivateLogFolder',
    })

    await seedFolderLogEntry(testModule!, folder.id, {
      message: 'Private log',
    })

    // Other user should not be able to list logs for this folder
    const response = await apiClient(otherToken).GET(
      '/api/v1/folders/{folderId}/logs',
      { params: { path: { folderId: folder.id } } },
    )
    expect([403, 404]).toContain(response.response.status)
  })

  it('should return 404 for non-existent log in folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'lognotfound',
      password: '123',
    })

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'NotFoundFolder',
    })

    const response = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/logs/{logId}',
      { params: { path: { folderId: folder.id, logId: uuidV4() } } },
    )
    expect(response.response.status).toEqual(404)
  })

  it('should only return logs for the requested folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'multifolderuser',
      password: '123',
    })

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder: folder1 } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'Folder A',
    })

    const { folder: folder2 } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'Folder B',
    })

    await seedFolderLogEntry(testModule!, folder1.id, {
      message: 'Folder A log',
    })
    await seedFolderLogEntry(testModule!, folder2.id, {
      message: 'Folder B log',
    })

    const response = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/logs',
      { params: { path: { folderId: folder1.id } } },
    )
    expect(response.response.status).toEqual(200)
    expect(response.data?.result.length).toEqual(1)
    expect(response.data?.result[0]?.message).toEqual('Folder A log')
  })
})
