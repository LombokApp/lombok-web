import { CORE_APP_SLUG } from '@lombokapp/types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestUser,
  testS3Location,
} from 'src/test/test.util'
import type { User } from 'src/users/entities/user.entity'

const TEST_MODULE_KEY = 'folder_app_permissions'

describe('Folder App Permissions', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient
  let enabledAppsCount = 0

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
    })
    apiClient = testModule.apiClient
    const apps = await testModule.services.appService.listAppsAsAdmin(
      {
        id: '1',
        isAdmin: true,
      } as User,
      { enabled: true },
    )
    enabledAppsCount = apps.result.length
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  // Folder-level app settings tests
  describe('Folder App Settings', () => {
    it(`should get folder app settings with defaults for the single app that is installed and enabled`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_folder1',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_folder1',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(CORE_APP_SLUG)
      await apiClient(adminToken).PUT(
        `/api/v1/server/apps/{appIdentifier}/enabled`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: { enabled: true },
        },
      )

      // Create a folder
      const bucketName = await testModule!.initMinioTestBucket([])
      const metadataBucketName = await testModule!.initMinioTestBucket()
      const createFolderResponse = await apiClient(accessToken).POST(
        '/api/v1/folders',
        {
          body: {
            name: 'Test Folder',
            contentLocation: testS3Location({ bucketName }),
            metadataLocation: testS3Location({
              bucketName: metadataBucketName,
            }),
          },
        },
      )

      if (!createFolderResponse.data?.folder.id) {
        throw new Error('Failed to create folder')
      }
      const folderId = createFolderResponse.data.folder.id

      // Get folder app settings (should be empty initially)
      const getSettingsResponse = await apiClient(accessToken).GET(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
        },
      )

      expect(getSettingsResponse.response.status).toEqual(200)
      expect(getSettingsResponse.data).toBeDefined()
      expect(Object.keys(getSettingsResponse.data?.settings ?? {}).length).toBe(
        enabledAppsCount,
      )
    })

    it(`should bulk update folder app settings (enable app)`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_folder2',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_folder2',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(CORE_APP_SLUG)
      await apiClient(adminToken).PUT(
        `/api/v1/server/apps/{appIdentifier}/enabled`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: { enabled: true },
        },
      )

      // Create a folder
      const bucketName = await testModule!.initMinioTestBucket([])
      const metadataBucketName = await testModule!.initMinioTestBucket()
      const createFolderResponse = await apiClient(accessToken).POST(
        '/api/v1/folders',
        {
          body: {
            name: 'Test Folder',
            contentLocation: testS3Location({ bucketName }),
            metadataLocation: testS3Location({
              bucketName: metadataBucketName,
            }),
          },
        },
      )

      if (!createFolderResponse.data?.folder.id) {
        throw new Error('Failed to create folder')
      }
      const folderId = createFolderResponse.data.folder.id

      // Update folder app settings - enable the app for the folder
      const updateResponse = await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: true,
            },
          },
        },
      )

      expect(updateResponse.response.status).toEqual(200)
      expect(updateResponse.data).toBeDefined()
      expect(Object.keys(updateResponse.data?.settings ?? {}).length).toBe(
        enabledAppsCount,
      )
      expect(updateResponse.data?.settings[appIdentifier]?.enabled).toBe(true)

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
        },
      )

      expect(Object.keys(getResponse.data?.settings ?? {}).length).toBe(
        enabledAppsCount,
      )
      expect(getResponse.data?.settings[appIdentifier]?.enabled).toBe(true)
    })

    it(`should bulk update folder app settings (disable app)`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_folder3',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_folder3',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(CORE_APP_SLUG)
      await apiClient(adminToken).PUT(
        `/api/v1/server/apps/{appIdentifier}/enabled`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: { enabled: true },
        },
      )

      // Create a folder
      const bucketName = await testModule!.initMinioTestBucket([])
      const metadataBucketName = await testModule!.initMinioTestBucket()
      const createFolderResponse = await apiClient(accessToken).POST(
        '/api/v1/folders',
        {
          body: {
            name: 'Test Folder',
            contentLocation: testS3Location({ bucketName }),
            metadataLocation: testS3Location({
              bucketName: metadataBucketName,
            }),
          },
        },
      )

      if (!createFolderResponse.data?.folder.id) {
        throw new Error('Failed to create folder')
      }
      const folderId = createFolderResponse.data.folder.id

      // First enable the app
      await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: true,
            },
          },
        },
      )

      // Then disable it
      const updateResponse = await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: false,
            },
          },
        },
      )

      expect(updateResponse.response.status).toEqual(200)
      expect(updateResponse.data).toBeDefined()
      expect(Object.keys(updateResponse.data?.settings ?? {}).length).toBe(
        enabledAppsCount,
      )
      expect(updateResponse.data?.settings[appIdentifier]?.enabled).toBe(false)

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
        },
      )

      expect(getResponse.data?.settings[appIdentifier]?.enabled).toBe(false)
    })

    it(`should bulk update folder app settings (set to null to use default)`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_folder4',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_folder4',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(CORE_APP_SLUG)
      await apiClient(adminToken).PUT(
        `/api/v1/server/apps/{appIdentifier}/enabled`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: { enabled: true },
        },
      )

      // Create a folder
      const bucketName = await testModule!.initMinioTestBucket([])
      const metadataBucketName = await testModule!.initMinioTestBucket()
      const createFolderResponse = await apiClient(accessToken).POST(
        '/api/v1/folders',
        {
          body: {
            name: 'Test Folder',
            contentLocation: testS3Location({ bucketName }),
            metadataLocation: testS3Location({
              bucketName: metadataBucketName,
            }),
          },
        },
      )

      if (!createFolderResponse.data?.folder.id) {
        throw new Error('Failed to create folder')
      }
      const folderId = createFolderResponse.data.folder.id

      // First enable the app
      await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: true,
            },
          },
        },
      )

      // Verify it's enabled
      let getResponse = await apiClient(accessToken).GET(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
        },
      )

      expect(Object.keys(getResponse.data?.settings ?? {}).length).toBe(
        enabledAppsCount,
      )
      expect(getResponse.data?.settings[appIdentifier]?.enabled).toBe(true)

      // Set to null to use default (should delete the setting)
      const updateResponse = await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: null,
          },
        },
      )

      expect(updateResponse.response.status).toEqual(200)
      expect(updateResponse.data).toBeDefined()
      expect(Object.keys(updateResponse.data?.settings ?? {}).length).toBe(
        enabledAppsCount,
      )

      // Verify by fetching
      getResponse = await apiClient(accessToken).GET(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
        },
      )

      expect(Object.keys(getResponse.data?.settings ?? {}).length).toBe(
        enabledAppsCount,
      )
    })

    it(`should bulk update multiple apps in folder settings`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_folder5',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_folder5',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(CORE_APP_SLUG)
      await apiClient(adminToken).PUT(
        `/api/v1/server/apps/{appIdentifier}/enabled`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: { enabled: true },
        },
      )

      // Create a folder
      const bucketName = await testModule!.initMinioTestBucket([])
      const metadataBucketName = await testModule!.initMinioTestBucket()
      const createFolderResponse = await apiClient(accessToken).POST(
        '/api/v1/folders',
        {
          body: {
            name: 'Test Folder',
            contentLocation: testS3Location({ bucketName }),
            metadataLocation: testS3Location({
              bucketName: metadataBucketName,
            }),
          },
        },
      )

      if (!createFolderResponse.data?.folder.id) {
        throw new Error('Failed to create folder')
      }
      const folderId = createFolderResponse.data.folder.id

      // Update multiple apps (even if only one exists)
      const updateResponse = await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: true,
            },
            'non-existent-app': {
              enabled: false,
            },
          },
        },
      )

      // Should succeed for existing app, but non-existent app should cause error
      // Actually, let's check if it validates app existence
      if (updateResponse.response.status === 200) {
        expect(updateResponse.data).toBeDefined()
        // Should only have the valid app
        expect(Object.keys(updateResponse.data?.settings ?? {}).length).toBe(
          enabledAppsCount,
        )
        expect(updateResponse.data?.settings[appIdentifier]?.enabled).toBe(true)
      } else {
        // If validation happens, should return 404 or 400
        expect([400, 404]).toContain(updateResponse.response.status)
      }
    })

    it(`should handle partial updates in folder settings (update one, leave others)`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_folder6',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_folder6',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(CORE_APP_SLUG)
      await apiClient(adminToken).PUT(
        `/api/v1/server/apps/{appIdentifier}/enabled`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: { enabled: true },
        },
      )

      // Create a folder
      const bucketName = await testModule!.initMinioTestBucket()
      const metadataBucketName = await testModule!.initMinioTestBucket()
      const createFolderResponse = await apiClient(accessToken).POST(
        '/api/v1/folders',
        {
          body: {
            name: 'Test Folder',
            contentLocation: testS3Location({ bucketName }),
            metadataLocation: testS3Location({
              bucketName: metadataBucketName,
            }),
          },
        },
      )

      if (!createFolderResponse.data?.folder.id) {
        throw new Error('Failed to create folder')
      }
      const folderId = createFolderResponse.data.folder.id

      // First enable the app
      await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: true,
            },
          },
        },
      )

      // Update to disabled (partial update - only this app in the body)
      const updateResponse = await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: false,
            },
          },
        },
      )

      expect(updateResponse.response.status).toEqual(200)
      expect(updateResponse.data).toBeDefined()
      expect(Object.keys(updateResponse.data?.settings ?? {}).length).toBe(
        enabledAppsCount,
      )
      expect(updateResponse.data?.settings[appIdentifier]?.enabled).toBe(false)
    })

    it(`should require folder edit permission to update folder app settings`, async () => {
      const {
        session: { accessToken: ownerToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_folder7_owner',
        password: '123',
      })

      const {
        session: { accessToken: unsharedUserToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_folder7_viewer',
        password: '123',
      })

      const {
        session: { accessToken: unpermissionedUserToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_folder7_viewer2',
        password: '123',
      })

      const unpermissionedUser = await apiClient(unpermissionedUserToken).GET(
        '/api/v1/viewer',
      )

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_folder7',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(CORE_APP_SLUG)
      await apiClient(adminToken).PUT(
        `/api/v1/server/apps/{appIdentifier}/enabled`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: { enabled: true },
        },
      )

      // Create a folder as owner
      const bucketName = await testModule!.initMinioTestBucket([])
      const metadataBucketName = await testModule!.initMinioTestBucket()
      const createFolderResponse = await apiClient(ownerToken).POST(
        '/api/v1/folders',
        {
          body: {
            name: 'Test Folder',
            contentLocation: testS3Location({ bucketName }),
            metadataLocation: testS3Location({
              bucketName: metadataBucketName,
            }),
          },
        },
      )

      if (!createFolderResponse.data?.folder.id) {
        throw new Error('Failed to create folder')
      }
      const folderId = createFolderResponse.data.folder.id

      // Unshared user should not see evidence of the folder
      const updateResponse = await apiClient(unsharedUserToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: true,
            },
          },
        },
      )

      // Should return 404
      expect(updateResponse.response.status).toEqual(404)

      await apiClient(ownerToken).POST(
        '/api/v1/folders/{folderId}/shares/{userId}',
        {
          params: {
            path: {
              folderId,
              userId: unpermissionedUser.data?.user.id ?? '',
            },
          },
          body: {
            permissions: [],
          },
        },
      )

      // Shared but not permissioned user should see 403 when trying to update settings
      const unpermissionedUpdateResponse = await apiClient(
        unpermissionedUserToken,
      ).PATCH(`/api/v1/folders/{folderId}/app-settings`, {
        params: {
          path: {
            folderId,
          },
        },
        body: {
          [appIdentifier]: {
            enabled: true,
          },
        },
      })

      // Should return 403
      expect(unpermissionedUpdateResponse.response.status).toEqual(403)

      // Owner should be able to update
      const ownerUpdateResponse = await apiClient(ownerToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: true,
            },
          },
        },
      )

      expect(ownerUpdateResponse.response.status).toEqual(200)
    })

    it(`should set permissions when creating folder app settings`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_folder8',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_folder8',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(CORE_APP_SLUG)
      await apiClient(adminToken).PUT(
        `/api/v1/server/apps/{appIdentifier}/enabled`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: { enabled: true },
        },
      )

      // Create a folder
      const bucketName = await testModule!.initMinioTestBucket([])
      const metadataBucketName = await testModule!.initMinioTestBucket()
      const createFolderResponse = await apiClient(accessToken).POST(
        '/api/v1/folders',
        {
          body: {
            name: 'Test Folder',
            contentLocation: testS3Location({ bucketName }),
            metadataLocation: testS3Location({
              bucketName: metadataBucketName,
            }),
          },
        },
      )

      if (!createFolderResponse.data?.folder.id) {
        throw new Error('Failed to create folder')
      }
      const folderId = createFolderResponse.data.folder.id

      // Update folder app settings with both enabled and permissions
      const updateResponse = await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: true,
              permissions: ['READ_OBJECTS', 'WRITE_OBJECTS'],
            },
          },
        },
      )

      expect(updateResponse.response.status).toEqual(200)
      expect(updateResponse.data).toBeDefined()
      expect(Object.keys(updateResponse.data?.settings ?? {}).length).toBe(
        enabledAppsCount,
      )
      expect(updateResponse.data?.settings[appIdentifier]?.enabled).toBe(true)
      expect(updateResponse.data?.settings[appIdentifier]?.permissions).toEqual(
        ['READ_OBJECTS', 'WRITE_OBJECTS'],
      )

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
        },
      )

      expect(getResponse.data?.settings[appIdentifier]?.enabled).toBe(true)
      expect(getResponse.data?.settings[appIdentifier]?.permissions).toEqual([
        'READ_OBJECTS',
        'WRITE_OBJECTS',
      ])
    })

    it(`should update permissions independently of enabled`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_folder9',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_folder9',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(CORE_APP_SLUG)
      await apiClient(adminToken).PUT(
        `/api/v1/server/apps/{appIdentifier}/enabled`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: { enabled: true },
        },
      )

      // Create a folder
      const bucketName = await testModule!.initMinioTestBucket([])
      const metadataBucketName = await testModule!.initMinioTestBucket()
      const createFolderResponse = await apiClient(accessToken).POST(
        '/api/v1/folders',
        {
          body: {
            name: 'Test Folder',
            contentLocation: testS3Location({ bucketName }),
            metadataLocation: testS3Location({
              bucketName: metadataBucketName,
            }),
          },
        },
      )

      if (!createFolderResponse.data?.folder.id) {
        throw new Error('Failed to create folder')
      }
      const folderId = createFolderResponse.data.folder.id

      // First set enabled and permissions
      await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: true,
              permissions: ['READ_OBJECTS'],
            },
          },
        },
      )

      // Update only permissions, keeping enabled unchanged
      const updateResponse = await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              permissions: ['WRITE_OBJECTS', 'WRITE_OBJECTS_METADATA'],
            },
          },
        },
      )

      expect(updateResponse.response.status).toEqual(200)
      expect(updateResponse.data?.settings[appIdentifier]?.enabled).toBe(true)
      expect(updateResponse.data?.settings[appIdentifier]?.permissions).toEqual(
        ['WRITE_OBJECTS', 'WRITE_OBJECTS_METADATA'],
      )

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
        },
      )

      expect(getResponse.data?.settings[appIdentifier]?.enabled).toBe(true)
      expect(getResponse.data?.settings[appIdentifier]?.permissions).toEqual([
        'WRITE_OBJECTS',
        'WRITE_OBJECTS_METADATA',
      ])
    })

    it(`should set permissions to null`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_folder10',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_folder10',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(CORE_APP_SLUG)
      await apiClient(adminToken).PUT(
        `/api/v1/server/apps/{appIdentifier}/enabled`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: { enabled: true },
        },
      )

      // Create a folder
      const bucketName = await testModule!.initMinioTestBucket([])
      const metadataBucketName = await testModule!.initMinioTestBucket()
      const createFolderResponse = await apiClient(accessToken).POST(
        '/api/v1/folders',
        {
          body: {
            name: 'Test Folder',
            contentLocation: testS3Location({ bucketName }),
            metadataLocation: testS3Location({
              bucketName: metadataBucketName,
            }),
          },
        },
      )

      if (!createFolderResponse.data?.folder.id) {
        throw new Error('Failed to create folder')
      }
      const folderId = createFolderResponse.data.folder.id

      // First set enabled and permissions
      await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: true,
              permissions: ['READ_OBJECTS'],
            },
          },
        },
      )

      // Set permissions to null
      const updateResponse = await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: true,
              permissions: null,
            },
          },
        },
      )

      expect(updateResponse.response.status).toEqual(200)
      expect(updateResponse.data?.settings[appIdentifier]?.enabled).toBe(true)
      expect(
        updateResponse.data?.settings[appIdentifier]?.permissions,
      ).toBeNull()

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
        },
      )

      expect(getResponse.data?.settings[appIdentifier]?.enabled).toBe(true)
      expect(getResponse.data?.settings[appIdentifier]?.permissions).toBeNull()
    })

    it(`should update only enabled without affecting permissions`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_folder11',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_folder11',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(CORE_APP_SLUG)
      await apiClient(adminToken).PUT(
        `/api/v1/server/apps/{appIdentifier}/enabled`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: { enabled: true },
        },
      )

      // Create a folder
      const bucketName = await testModule!.initMinioTestBucket([])
      const metadataBucketName = await testModule!.initMinioTestBucket()
      const createFolderResponse = await apiClient(accessToken).POST(
        '/api/v1/folders',
        {
          body: {
            name: 'Test Folder',
            contentLocation: testS3Location({ bucketName }),
            metadataLocation: testS3Location({
              bucketName: metadataBucketName,
            }),
          },
        },
      )

      if (!createFolderResponse.data?.folder.id) {
        throw new Error('Failed to create folder')
      }
      const folderId = createFolderResponse.data.folder.id

      // First set enabled and permissions
      await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: true,
              permissions: ['READ_OBJECTS', 'WRITE_OBJECTS'],
            },
          },
        },
      )

      // Update only enabled, keeping permissions unchanged
      const updateResponse = await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: false,
            },
          },
        },
      )

      expect(updateResponse.response.status).toEqual(200)
      expect(updateResponse.data?.settings[appIdentifier]?.enabled).toBe(false)
      expect(updateResponse.data?.settings[appIdentifier]?.permissions).toEqual(
        ['READ_OBJECTS', 'WRITE_OBJECTS'],
      )

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
        },
      )

      expect(getResponse.data?.settings[appIdentifier]?.enabled).toBe(false)
      expect(getResponse.data?.settings[appIdentifier]?.permissions).toEqual([
        'READ_OBJECTS',
        'WRITE_OBJECTS',
      ])
    })

    it(`should verify enabledFallback and permissionsFallback structure`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_folder12',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_folder12',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(CORE_APP_SLUG)
      await apiClient(adminToken).PUT(
        `/api/v1/server/apps/{appIdentifier}/enabled`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: { enabled: true },
        },
      )

      // Create a folder
      const bucketName = await testModule!.initMinioTestBucket([])
      const metadataBucketName = await testModule!.initMinioTestBucket()
      const createFolderResponse = await apiClient(accessToken).POST(
        '/api/v1/folders',
        {
          body: {
            name: 'Test Folder',
            contentLocation: testS3Location({ bucketName }),
            metadataLocation: testS3Location({
              bucketName: metadataBucketName,
            }),
          },
        },
      )

      if (!createFolderResponse.data?.folder.id) {
        throw new Error('Failed to create folder')
      }
      const folderId = createFolderResponse.data.folder.id

      // Get settings without any folder-specific settings (should use system defaults)
      let getResponse = await apiClient(accessToken).GET(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
        },
      )

      expect(Object.keys(getResponse.data?.settings ?? {}).length).toBe(
        enabledAppsCount,
      )

      // Set folder settings
      await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: true,
              permissions: ['READ_OBJECTS'],
            },
          },
        },
      )

      // Get settings again
      getResponse = await apiClient(accessToken).GET(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
        },
      )

      const settings = getResponse.data?.settings[appIdentifier]
      expect(settings).toBeDefined()
      expect(settings?.appIdentifier).toBe(appIdentifier)
      expect(settings?.enabled).toBe(true)
      expect(settings?.permissions).toEqual(['READ_OBJECTS'])

      // Verify fallback structure
      expect(settings?.enabledFallback).toBeDefined()
      if (settings?.enabledFallback) {
        expect(settings.enabledFallback.value).toBeTypeOf('boolean')
        expect(['system', 'user']).toContain(settings.enabledFallback.source)
      }

      expect(settings?.permissionsFallback).toBeDefined()
      if (settings?.permissionsFallback) {
        expect(Array.isArray(settings.permissionsFallback.value)).toBe(true)
        expect(['system', 'user']).toContain(
          settings.permissionsFallback.source,
        )
      }
    })

    it(`should verify fallback values when folder settings are null`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_folder13',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_folder13',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(CORE_APP_SLUG)
      await apiClient(adminToken).PUT(
        `/api/v1/server/apps/{appIdentifier}/enabled`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: { enabled: true },
        },
      )

      // Create a folder
      const bucketName = await testModule!.initMinioTestBucket([])
      const metadataBucketName = await testModule!.initMinioTestBucket()
      const createFolderResponse = await apiClient(accessToken).POST(
        '/api/v1/folders',
        {
          body: {
            name: 'Test Folder',
            contentLocation: testS3Location({ bucketName }),
            metadataLocation: testS3Location({
              bucketName: metadataBucketName,
            }),
          },
        },
      )

      if (!createFolderResponse.data?.folder.id) {
        throw new Error('Failed to create folder')
      }
      const folderId = createFolderResponse.data.folder.id

      // Get settings without any folder-specific settings
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
        },
      )

      expect(Object.keys(getResponse.data?.settings ?? {}).length).toBe(
        enabledAppsCount,
      )
      expect(getResponse.data?.settings[appIdentifier]?.enabled).toBe(null)
      expect(
        getResponse.data?.settings[appIdentifier]?.enabledFallback,
      ).toEqual({ value: false, source: 'system' })
    })

    it(`should delete folder app settings by setting app to null`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_folder14',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_folder14',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(CORE_APP_SLUG)
      await apiClient(adminToken).PUT(
        `/api/v1/server/apps/{appIdentifier}/enabled`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: { enabled: true },
        },
      )

      // Create a folder
      const bucketName = await testModule!.initMinioTestBucket([])
      const metadataBucketName = await testModule!.initMinioTestBucket()
      const createFolderResponse = await apiClient(accessToken).POST(
        '/api/v1/folders',
        {
          body: {
            name: 'Test Folder',
            contentLocation: testS3Location({ bucketName }),
            metadataLocation: testS3Location({
              bucketName: metadataBucketName,
            }),
          },
        },
      )

      if (!createFolderResponse.data?.folder.id) {
        throw new Error('Failed to create folder')
      }
      const folderId = createFolderResponse.data.folder.id

      // First set enabled and permissions
      await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: {
              enabled: true,
              permissions: ['READ_OBJECTS'],
            },
          },
        },
      )

      // Delete the setting by setting the app to null
      const updateResponse = await apiClient(accessToken).PATCH(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
          body: {
            [appIdentifier]: null,
          },
        },
      )

      expect(updateResponse.response.status).toEqual(200)
      expect(updateResponse.data?.settings[appIdentifier]?.enabled).toBe(null)

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/folders/{folderId}/app-settings`,
        {
          params: {
            path: {
              folderId,
            },
          },
        },
      )

      expect(getResponse.data?.settings[appIdentifier]?.enabled).toBe(null)
    })
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
