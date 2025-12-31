import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { DUMMY_APP_SLUG } from 'test/e2e.setup'

const TEST_MODULE_KEY = 'user_app_permissions'

describe('User App Permissions', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
    })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  it(`should get app user settings with defaults`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser7',
      password: '123',
    })

    // Enable app as admin
    const {
      session: { accessToken: adminToken },
    } = await createTestUser(testModule!, {
      username: 'admin7',
      password: '123',
      admin: true,
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

    const getSettingsResponse = await apiClient(accessToken).GET(
      `/api/v1/user/apps/{appIdentifier}/settings`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
      },
    )

    expect(getSettingsResponse.response.status).toEqual(200)
    expect(getSettingsResponse.data).toBeDefined()
    if (!getSettingsResponse.data) {
      throw new Error('No response data received')
    }
    const settings = getSettingsResponse.data.settings
    expect(settings.appIdentifier).toBe(appIdentifier)
    // Should have default values
    expect(typeof settings.enabledFallback).toBe('boolean')
    expect(typeof settings.folderScopeEnabledDefaultFallback).toBe('boolean')
    // User settings should be null (using defaults)
    expect(settings.enabled).toBeNull()
    expect(settings.folderScopeEnabledDefault).toBeNull()
    // When enabled is null, the effective value is enabledFallback
    // (The UI will resolve null to enabledFallback for display)
  })

  it(`should create app user settings`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser8',
      password: '123',
    })

    // Enable app as admin
    const {
      session: { accessToken: adminToken },
    } = await createTestUser(testModule!, {
      username: 'admin8',
      password: '123',
      admin: true,
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

    const createSettingsResponse = await apiClient(accessToken).POST(
      `/api/v1/user/apps/{appIdentifier}/settings`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
        body: {
          enabled: true,
          folderScopeEnabledDefault: false,
          folderScopePermissionsDefault: null,
          permissions: null,
        },
      },
    )

    expect(createSettingsResponse.response.status).toEqual(201)
    expect(createSettingsResponse.data).toBeDefined()
    if (!createSettingsResponse.data) {
      throw new Error('No response data received')
    }
    expect(createSettingsResponse.data.settings.enabled).toBe(true)
    expect(createSettingsResponse.data.settings.folderScopeEnabledDefault).toBe(
      false,
    )

    // Verify settings were saved by fetching them
    const getSettingsResponse = await apiClient(accessToken).GET(
      `/api/v1/user/apps/{appIdentifier}/settings`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
      },
    )

    expect(getSettingsResponse.response.status).toEqual(200)
    expect(getSettingsResponse.data?.settings.enabled).toBe(true)
    expect(getSettingsResponse.data?.settings.folderScopeEnabledDefault).toBe(
      false,
    )
  })

  it(`should update app user settings`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser9',
      password: '123',
    })

    // Enable app as admin
    const {
      session: { accessToken: adminToken },
    } = await createTestUser(testModule!, {
      username: 'admin9',
      password: '123',
      admin: true,
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

    // Create initial settings
    await apiClient(accessToken).POST(
      `/api/v1/user/apps/{appIdentifier}/settings`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
        body: {
          enabled: true,
          folderScopeEnabledDefault: true,
          folderScopePermissionsDefault: null,
          permissions: null,
        },
      },
    )

    // Update settings
    const updateSettingsResponse = await apiClient(accessToken).POST(
      `/api/v1/user/apps/{appIdentifier}/settings`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
        body: {
          enabled: false,
          folderScopeEnabledDefault: false,
          folderScopePermissionsDefault: null,
          permissions: null,
        },
      },
    )

    expect(updateSettingsResponse.response.status).toEqual(201)
    expect(updateSettingsResponse.data).toBeDefined()
    if (!updateSettingsResponse.data) {
      throw new Error('No response data received')
    }
    expect(updateSettingsResponse.data.settings.enabled).toBe(false)
    expect(updateSettingsResponse.data.settings.folderScopeEnabledDefault).toBe(
      false,
    )
  })

  it(`should delete app user settings`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser10',
      password: '123',
    })

    // Enable app as admin
    const {
      session: { accessToken: adminToken },
    } = await createTestUser(testModule!, {
      username: 'admin10',
      password: '123',
      admin: true,
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

    // Create settings
    await apiClient(accessToken).POST(
      `/api/v1/user/apps/{appIdentifier}/settings`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
        body: {
          enabled: true,
          folderScopeEnabledDefault: true,
          folderScopePermissionsDefault: null,
          permissions: null,
        },
      },
    )

    // Delete settings
    const deleteSettingsResponse = await apiClient(accessToken).DELETE(
      `/api/v1/user/apps/{appIdentifier}/settings`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
      },
    )

    expect(deleteSettingsResponse.response.status).toEqual(200)

    // Verify settings are deleted (should return defaults)
    const getSettingsResponse = await apiClient(accessToken).GET(
      `/api/v1/user/apps/{appIdentifier}/settings`,
      {
        params: {
          path: {
            appIdentifier,
          },
        },
      },
    )

    expect(getSettingsResponse.response.status).toEqual(200)
    expect(getSettingsResponse.data).toBeDefined()
    if (!getSettingsResponse.data) {
      throw new Error('No response data received')
    }
    // After deletion, should return null values (using defaults)
    expect(getSettingsResponse.data.settings.enabled).toBeNull()
    expect(
      getSettingsResponse.data.settings.folderScopeEnabledDefault,
    ).toBeNull()
    // Should have default values available
    expect(typeof getSettingsResponse.data.settings.enabledFallback).toBe(
      'boolean',
    )
    expect(
      typeof getSettingsResponse.data.settings
        .folderScopeEnabledDefaultFallback,
    ).toBe('boolean')
  })

  // User-level app settings with nullable values tests
  describe('User App Settings - Nullable Values', () => {
    it(`should create settings with enabled set to null (use system default)`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_null1',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_null1',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

      // Get default values first
      const defaultSettingsResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      if (!defaultSettingsResponse.data) {
        throw new Error('No response data received')
      }
      const defaultEnabled =
        defaultSettingsResponse.data.settings.enabledFallback

      // Create settings with enabled=null (use default), folderScopeEnabledDefault=false
      const createResponse = await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: null,
            folderScopeEnabledDefault: false,
            folderScopePermissionsDefault: null,
            permissions: null,
          },
        },
      )

      expect(createResponse.response.status).toEqual(201)
      expect(createResponse.data).toBeDefined()
      if (!createResponse.data) {
        throw new Error('No response data received')
      }
      // enabled should be null in stored value (using system default)
      expect(createResponse.data.settings.enabled).toBeNull()
      expect(createResponse.data.settings.enabledFallback).toBe(defaultEnabled)
      expect(createResponse.data.settings.folderScopeEnabledDefault).toBe(false)

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      expect(getResponse.data?.settings.enabled).toBeNull()
      expect(getResponse.data?.settings.enabledFallback).toBe(defaultEnabled)
      expect(getResponse.data?.settings.folderScopeEnabledDefault).toBe(false)
    })

    it(`should create settings with folderScopeEnabledDefault set to null (use system default)`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_null2',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_null2',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

      // Get default values first
      const defaultSettingsResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      if (!defaultSettingsResponse.data) {
        throw new Error('No response data received')
      }
      const defaultFolderAccess =
        defaultSettingsResponse.data.settings.folderScopeEnabledDefaultFallback

      // Create settings with enabled=true, folderScopeEnabledDefault=null
      const createResponse = await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: true,
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: null,
            permissions: null,
          },
        },
      )

      expect(createResponse.response.status).toEqual(201)
      expect(createResponse.data).toBeDefined()
      if (!createResponse.data) {
        throw new Error('No response data received')
      }
      expect(createResponse.data.settings.enabled).toBe(true)
      // folderScopeEnabledDefault should be null in stored value (using system default)
      expect(createResponse.data.settings.folderScopeEnabledDefault).toBeNull()
      expect(
        createResponse.data.settings.folderScopeEnabledDefaultFallback,
      ).toBe(defaultFolderAccess)

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      expect(getResponse.data?.settings.enabled).toBe(true)
      expect(getResponse.data?.settings.folderScopeEnabledDefault).toBeNull()
      expect(getResponse.data?.settings.folderScopeEnabledDefaultFallback).toBe(
        defaultFolderAccess,
      )
    })

    it(`should update settings to set enabled to null (reset to default)`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_null3',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_null3',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

      // Get default values
      const defaultSettingsResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      if (!defaultSettingsResponse.data) {
        throw new Error('No response data received')
      }
      const defaultEnabled =
        defaultSettingsResponse.data.settings.enabledFallback

      // Create initial settings with both values set
      await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: true,
            folderScopeEnabledDefault: true,
            folderScopePermissionsDefault: null,
            permissions: null,
          },
        },
      )

      // Update to set enabled to null (use default)
      const updateResponse = await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: null,
            folderScopeEnabledDefault: true,
            folderScopePermissionsDefault: null,
            permissions: null,
          },
        },
      )

      expect(updateResponse.response.status).toEqual(201)
      expect(updateResponse.data).toBeDefined()
      if (!updateResponse.data) {
        throw new Error('No response data received')
      }
      // enabled should be null (using system default)
      expect(updateResponse.data.settings.enabled).toBeNull()
      expect(updateResponse.data.settings.enabledFallback).toBe(defaultEnabled)
      expect(updateResponse.data.settings.folderScopeEnabledDefault).toBe(true)

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      expect(getResponse.data?.settings.enabled).toBeNull()
      expect(getResponse.data?.settings.enabledFallback).toBe(defaultEnabled)
      expect(getResponse.data?.settings.folderScopeEnabledDefault).toBe(true)
    })

    it(`should handle both values set to null (should delete settings)`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_null4',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_null4',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

      // Create initial settings
      await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: true,
            folderScopeEnabledDefault: true,
            folderScopePermissionsDefault: null,
            permissions: null,
          },
        },
      )

      // Verify settings exist
      const beforeDeleteResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      expect(beforeDeleteResponse.data?.settings.enabled).toBe(true)
      expect(
        beforeDeleteResponse.data?.settings.folderScopeEnabledDefault,
      ).toBe(true)

      // Setting both to null should effectively delete the settings
      // (In practice, the frontend would call DELETE, but we test the null behavior)
      const updateResponse = await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: null,
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: null,
            permissions: null,
          },
        },
      )

      expect(updateResponse.response.status).toEqual(201)
      expect(updateResponse.data).toBeDefined()
      if (!updateResponse.data) {
        throw new Error('No response data received')
      }
      // Both should be null
      expect(updateResponse.data.settings.enabled).toBeNull()
      expect(updateResponse.data.settings.folderScopeEnabledDefault).toBeNull()

      // Verify by fetching - should still have null values
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      expect(getResponse.data?.settings.enabled).toBeNull()
      expect(getResponse.data?.settings.folderScopeEnabledDefault).toBeNull()
    })
  })

  // User-level app settings with permissions tests
  describe('User App Settings - Permissions', () => {
    it(`should set user scope permissions when creating settings`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_perm1',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_perm1',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

      // Create settings with user scope permissions
      const createResponse = await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: true,
            folderScopeEnabledDefault: false,
            folderScopePermissionsDefault: null,
            permissions: ['CREATE_FOLDERS', 'READ_FOLDERS'],
          },
        },
      )

      expect(createResponse.response.status).toEqual(201)
      expect(createResponse.data).toBeDefined()
      if (!createResponse.data) {
        throw new Error('No response data received')
      }
      expect(createResponse.data.settings.enabled).toBe(true)
      expect(createResponse.data.settings.permissions).toEqual([
        'CREATE_FOLDERS',
        'READ_FOLDERS',
      ])

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      expect(getResponse.data?.settings.permissions).toEqual([
        'CREATE_FOLDERS',
        'READ_FOLDERS',
      ])
    })

    it(`should set folder scope default permissions when creating settings`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_perm2',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_perm2',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

      // Create settings with folder scope default permissions
      const createResponse = await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: true,
            folderScopeEnabledDefault: true,
            folderScopePermissionsDefault: ['READ_OBJECTS', 'WRITE_OBJECTS'],
            permissions: null,
          },
        },
      )

      expect(createResponse.response.status).toEqual(201)
      expect(createResponse.data).toBeDefined()
      if (!createResponse.data) {
        throw new Error('No response data received')
      }
      expect(createResponse.data.settings.enabled).toBe(true)
      expect(
        createResponse.data.settings.folderScopePermissionsDefault,
      ).toEqual(['READ_OBJECTS', 'WRITE_OBJECTS'])

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      expect(getResponse.data?.settings.folderScopePermissionsDefault).toEqual([
        'READ_OBJECTS',
        'WRITE_OBJECTS',
      ])
    })

    it(`should update permissions independently of other fields`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_perm3',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_perm3',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

      // Create initial settings
      await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: true,
            folderScopeEnabledDefault: true,
            folderScopePermissionsDefault: ['READ_OBJECTS'],
            permissions: ['CREATE_FOLDERS'],
          },
        },
      )

      // Update only user scope permissions
      const updateResponse = await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: true,
            folderScopeEnabledDefault: true,
            folderScopePermissionsDefault: ['READ_OBJECTS'],
            permissions: ['READ_FOLDERS', 'UPDATE_FOLDERS'],
          },
        },
      )

      expect(updateResponse.response.status).toEqual(201)
      expect(updateResponse.data?.settings.enabled).toBe(true)
      expect(updateResponse.data?.settings.folderScopeEnabledDefault).toBe(true)
      expect(
        updateResponse.data?.settings.folderScopePermissionsDefault,
      ).toEqual(['READ_OBJECTS'])
      expect(updateResponse.data?.settings.permissions).toEqual([
        'READ_FOLDERS',
        'UPDATE_FOLDERS',
      ])

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      expect(getResponse.data?.settings.permissions).toEqual([
        'READ_FOLDERS',
        'UPDATE_FOLDERS',
      ])
      expect(getResponse.data?.settings.folderScopePermissionsDefault).toEqual([
        'READ_OBJECTS',
      ])
    })

    it(`should preserve permissions when updating other fields`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_perm4',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_perm4',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

      // Create initial settings with permissions
      await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: true,
            folderScopeEnabledDefault: true,
            folderScopePermissionsDefault: ['READ_OBJECTS'],
            permissions: ['CREATE_FOLDERS'],
          },
        },
      )

      // Update only enabled, keeping permissions unchanged
      const updateResponse = await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: false,
            folderScopeEnabledDefault: true,
            folderScopePermissionsDefault: ['READ_OBJECTS'],
            permissions: ['CREATE_FOLDERS'],
          },
        },
      )

      expect(updateResponse.response.status).toEqual(201)
      expect(updateResponse.data?.settings.enabled).toBe(false)
      expect(updateResponse.data?.settings.permissions).toEqual([
        'CREATE_FOLDERS',
      ])
      expect(
        updateResponse.data?.settings.folderScopePermissionsDefault,
      ).toEqual(['READ_OBJECTS'])

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      expect(getResponse.data?.settings.enabled).toBe(false)
      expect(getResponse.data?.settings.permissions).toEqual(['CREATE_FOLDERS'])
      expect(getResponse.data?.settings.folderScopePermissionsDefault).toEqual([
        'READ_OBJECTS',
      ])
    })

    it(`should verify permissionsFallback structure and values`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_perm5',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_perm5',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

      // Get settings without any user-specific settings (should use system defaults)
      const defaultResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      expect(defaultResponse.data?.settings.permissionsFallback).toBeDefined()
      expect(
        Array.isArray(defaultResponse.data?.settings.permissionsFallback),
      ).toBe(true)

      // Create settings with permissions
      await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: true,
            folderScopeEnabledDefault: false,
            folderScopePermissionsDefault: null,
            permissions: ['CREATE_FOLDERS', 'READ_FOLDERS'],
          },
        },
      )

      // Get settings again
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      expect(getResponse.data?.settings.permissions).toEqual([
        'CREATE_FOLDERS',
        'READ_FOLDERS',
      ])
      expect(getResponse.data?.settings.permissionsFallback).toBeDefined()
      expect(
        Array.isArray(getResponse.data?.settings.permissionsFallback),
      ).toBe(true)
    })

    it(`should test fallback when permissions are null`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_perm6',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_perm6',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

      // Get default settings first
      const defaultResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      const defaultPermissions =
        defaultResponse.data?.settings.permissionsFallback

      // Create settings with permissions set to null
      const createResponse = await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: true,
            folderScopeEnabledDefault: false,
            folderScopePermissionsDefault: null,
            permissions: null,
          },
        },
      )

      expect(createResponse.response.status).toEqual(201)
      expect(createResponse.data?.settings.permissions).toBeNull()
      expect(createResponse.data?.settings.permissionsFallback).toEqual(
        defaultPermissions,
      )

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      expect(getResponse.data?.settings.permissions).toBeNull()
      expect(getResponse.data?.settings.permissionsFallback).toEqual(
        defaultPermissions,
      )
    })

    it(`should set permissions with enabled set to null`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_perm7',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_perm7',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

      // Create settings with enabled=null but permissions set
      const createResponse = await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: null,
            folderScopeEnabledDefault: false,
            folderScopePermissionsDefault: null,
            permissions: ['CREATE_FOLDERS'],
          },
        },
      )

      expect(createResponse.response.status).toEqual(201)
      expect(createResponse.data?.settings.enabled).toBeNull()
      expect(createResponse.data?.settings.permissions).toEqual([
        'CREATE_FOLDERS',
      ])

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      expect(getResponse.data?.settings.enabled).toBeNull()
      expect(getResponse.data?.settings.permissions).toEqual(['CREATE_FOLDERS'])
    })

    it(`should set folderScopePermissionsDefault with enabled set to null`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_perm8',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_perm8',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

      // Create settings with enabled=null but folderScopePermissionsDefault set
      const createResponse = await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: null,
            folderScopeEnabledDefault: true,
            folderScopePermissionsDefault: ['READ_OBJECTS', 'WRITE_OBJECTS'],
            permissions: null,
          },
        },
      )

      expect(createResponse.response.status).toEqual(201)
      expect(createResponse.data?.settings.enabled).toBeNull()
      expect(
        createResponse.data?.settings.folderScopePermissionsDefault,
      ).toEqual(['READ_OBJECTS', 'WRITE_OBJECTS'])

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      expect(getResponse.data?.settings.enabled).toBeNull()
      expect(getResponse.data?.settings.folderScopePermissionsDefault).toEqual([
        'READ_OBJECTS',
        'WRITE_OBJECTS',
      ])
    })

    it(`should update only permissions without changing other fields`, async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'testuser_perm9',
        password: '123',
      })

      const {
        session: { accessToken: adminToken },
      } = await createTestUser(testModule!, {
        username: 'admin_perm9',
        password: '123',
        admin: true,
      })

      const appIdentifier =
        await testModule!.getAppIdentifierBySlug(DUMMY_APP_SLUG)
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

      // Create initial settings
      await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: true,
            folderScopeEnabledDefault: true,
            folderScopePermissionsDefault: ['READ_OBJECTS'],
            permissions: ['CREATE_FOLDERS'],
          },
        },
      )

      // Update only user scope permissions, keeping everything else the same
      const updateResponse = await apiClient(accessToken).POST(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
          body: {
            enabled: true,
            folderScopeEnabledDefault: true,
            folderScopePermissionsDefault: ['READ_OBJECTS'],
            permissions: ['READ_FOLDERS', 'UPDATE_FOLDERS', 'DELETE_FOLDERS'],
          },
        },
      )

      expect(updateResponse.response.status).toEqual(201)
      expect(updateResponse.data?.settings.enabled).toBe(true)
      expect(updateResponse.data?.settings.folderScopeEnabledDefault).toBe(true)
      expect(
        updateResponse.data?.settings.folderScopePermissionsDefault,
      ).toEqual(['READ_OBJECTS'])
      expect(updateResponse.data?.settings.permissions).toEqual([
        'READ_FOLDERS',
        'UPDATE_FOLDERS',
        'DELETE_FOLDERS',
      ])

      // Verify by fetching
      const getResponse = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/settings`,
        {
          params: {
            path: {
              appIdentifier,
            },
          },
        },
      )

      expect(getResponse.data?.settings.enabled).toBe(true)
      expect(getResponse.data?.settings.folderScopeEnabledDefault).toBe(true)
      expect(getResponse.data?.settings.folderScopePermissionsDefault).toEqual([
        'READ_OBJECTS',
      ])
      expect(getResponse.data?.settings.permissions).toEqual([
        'READ_FOLDERS',
        'UPDATE_FOLDERS',
        'DELETE_FOLDERS',
      ])
    })
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
