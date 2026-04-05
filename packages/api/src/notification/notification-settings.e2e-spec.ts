import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'

const TEST_MODULE_KEY = 'notification_settings'

describe('Notification Settings', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  it('should require authentication', async () => {
    const response = await apiClient().GET('/api/v1/notifications/settings')
    expect(response.response.status).toEqual(401)
  })

  it('should get empty global settings for new user', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'settingsuser',
      password: '123',
    })

    const response = await apiClient(accessToken).GET(
      '/api/v1/notifications/settings',
    )
    expect(response.response.status).toEqual(200)
    expect(response.data?.settings).toBeArray()
  })

  it('should update and retrieve global notification settings', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'updateuser',
      password: '123',
    })

    const settings = [
      {
        eventIdentifier: 'object_added',
        emitterIdentifier: 'core',
        channel: 'web' as const,
        enabled: false,
      },
      {
        eventIdentifier: 'object_added',
        emitterIdentifier: 'core',
        channel: 'email' as const,
        enabled: true,
      },
    ]

    const updateResponse = await apiClient(accessToken).PUT(
      '/api/v1/notifications/settings',
      { body: { settings } },
    )
    expect(updateResponse.response.status).toEqual(200)
    expect(updateResponse.data?.settings).toBeArray()
    expect(updateResponse.data?.settings.length).toEqual(2)

    // Verify the settings persisted
    const getResponse = await apiClient(accessToken).GET(
      '/api/v1/notifications/settings',
    )
    expect(getResponse.response.status).toEqual(200)
    expect(getResponse.data?.settings.length).toEqual(2)

    const webSetting = getResponse.data?.settings.find(
      (s) => s.channel === 'web',
    )
    expect(webSetting?.enabled).toEqual(false)

    const emailSetting = getResponse.data?.settings.find(
      (s) => s.channel === 'email',
    )
    expect(emailSetting?.enabled).toEqual(true)
  })

  it('should isolate settings between users', async () => {
    const {
      session: { accessToken: token1 },
    } = await createTestUser(testModule!, {
      username: 'isouser1',
      password: '123',
    })

    const {
      session: { accessToken: token2 },
    } = await createTestUser(testModule!, {
      username: 'isouser2',
      password: '123',
    })

    // User 1 updates settings
    await apiClient(token1).PUT('/api/v1/notifications/settings', {
      body: {
        settings: [
          {
            eventIdentifier: 'object_added',
            emitterIdentifier: 'core',
            channel: 'web' as const,
            enabled: false,
          },
        ],
      },
    })

    // User 2 should not see user 1's settings
    const user2Settings = await apiClient(token2).GET(
      '/api/v1/notifications/settings',
    )
    expect(user2Settings.data?.settings.length).toEqual(0)
  })

  it('should get and update folder-specific notification settings', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'folderuser',
      password: '123',
    })

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken,
      apiClient,
      folderName: 'Notif Test Folder',
    })

    // Get folder settings (initially empty)
    const getResponse = await apiClient(accessToken).GET(
      '/api/v1/notifications/settings/folders/{folderId}',
      { params: { path: { folderId: folder.id } } },
    )
    expect(getResponse.response.status).toEqual(200)
    expect(getResponse.data?.settings).toBeArray()

    // Update folder settings
    const updateResponse = await apiClient(accessToken).PUT(
      '/api/v1/notifications/settings/folders/{folderId}',
      {
        params: { path: { folderId: folder.id } },
        body: {
          settings: [
            {
              eventIdentifier: 'object_added',
              emitterIdentifier: 'core',
              channel: 'web' as const,
              enabled: false,
            },
          ],
        },
      },
    )
    expect(updateResponse.response.status).toEqual(200)
    expect(updateResponse.data?.settings.length).toEqual(1)
    expect(updateResponse.data?.settings[0]?.enabled).toEqual(false)
  })

  it('should not allow access to other users folder settings', async () => {
    const {
      session: { accessToken: ownerToken },
    } = await createTestUser(testModule!, {
      username: 'folderowner',
      password: '123',
    })

    const {
      session: { accessToken: otherToken },
    } = await createTestUser(testModule!, {
      username: 'otheruser',
      password: '123',
    })

    await testModule!.setServerStorageLocation()
    await testModule!.initMinioTestBucket()

    const { folder } = await createTestFolder({
      testModule: testModule!,
      accessToken: ownerToken,
      apiClient,
      folderName: 'Private Folder',
    })

    // Other user should not access the folder settings
    const response = await apiClient(otherToken).GET(
      '/api/v1/notifications/settings/folders/{folderId}',
      { params: { path: { folderId: folder.id } } },
    )
    expect([403, 404]).toContain(response.response.status)
  })
})
