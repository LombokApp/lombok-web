import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { v4 as uuidV4 } from 'uuid'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'
import { eventsTable } from './entities/event.entity'

const TEST_MODULE_KEY = 'folder_events'

async function seedFolderEvent(
  testModule: TestModule,
  folderId: string,
  overrides: Partial<typeof eventsTable.$inferInsert> = {},
) {
  const id = uuidV4()
  const now = new Date()
  await testModule.services.ormService.db.insert(eventsTable).values({
    id,
    eventIdentifier: 'object_added',
    emitterIdentifier: 'core',
    targetLocationFolderId: folderId,
    createdAt: now,
    ...overrides,
  })
  return { id }
}

describe('Folder Events', () => {
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
    const response = await apiClient().GET('/api/v1/folders/{folderId}/events', {
      params: { path: { folderId: uuidV4() } },
    })
    expect(response.response.status).toEqual(401)
  })

  it('should list events for a folder the user owns', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, { username: 'evtuser', password: '123' })

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'EventFolder',
    })

    await seedFolderEvent(testModule!, folder.id)
    await seedFolderEvent(testModule!, folder.id)

    const response = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/events',
      { params: { path: { folderId: folder.id } } },
    )
    expect(response.response.status).toEqual(200)
    expect(response.data?.result).toBeArray()
    expect(response.data?.result.length).toEqual(2)
    expect(response.data?.meta.totalCount).toEqual(2)
  })

  it('should get a single folder event by ID', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, { username: 'evtget', password: '123' })

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'EventGetFolder',
    })

    const { id: eventId } = await seedFolderEvent(testModule!, folder.id, {
      eventIdentifier: 'object_updated',
    })

    const response = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/events/{eventId}',
      { params: { path: { folderId: folder.id, eventId } } },
    )
    expect(response.response.status).toEqual(200)
    expect(response.data?.event.eventIdentifier).toEqual('object_updated')
  })

  it('should not list events for a folder the user does not own', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, { username: 'evtowner', password: '123' })

    const {
      session: { accessToken: otherToken },
    } = await createTestUser(testModule!, { username: 'evtother', password: '123' })

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken: ownerToken,
      apiClient,
      folderName: 'PrivateEventFolder',
    })

    await seedFolderEvent(testModule!, folder.id)

    const response = await apiClient(otherToken).GET(
      '/api/v1/folders/{folderId}/events',
      { params: { path: { folderId: folder.id } } },
    )
    expect([403, 404]).toContain(response.response.status)
  })

  it('should return 404 for non-existent event in folder', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, { username: 'evtmissing', password: '123' })

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'MissingEventFolder',
    })

    const response = await apiClient(accessToken).GET(
      '/api/v1/folders/{folderId}/events/{eventId}',
      { params: { path: { folderId: folder.id, eventId: uuidV4() } } },
    )
    expect(response.response.status).toEqual(404)
  })
})
