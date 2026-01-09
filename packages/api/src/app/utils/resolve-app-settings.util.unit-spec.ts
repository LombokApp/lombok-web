import type {
  CoreScopeAppPermissions,
  FolderScopeAppPermissions,
  UserScopeAppPermissions,
} from '@lombokapp/types'
import { describe, expect, it } from 'bun:test'

import type { App } from '../entities/app.entity'
import type { AppFolderSettings } from '../entities/app-folder-settings.entity'
import type { AppUserSettings } from '../entities/app-user-settings.entity'
import {
  resolveFolderAppSettings,
  resolveUserAppSettings,
} from './resolve-app-settings.utils'

const createMockApp = ({
  slug,
  folderScopeEnabledDefault,
  userScopeEnabledDefault,
  permissions,
}: {
  slug: string
  folderScopeEnabledDefault: boolean
  userScopeEnabledDefault: boolean
  permissions: {
    core: CoreScopeAppPermissions[]
    user: UserScopeAppPermissions[]
    folder: FolderScopeAppPermissions[]
  }
}): App => {
  return {
    slug,
    identifier: slug,
    label: 'Test App',
    publicKey: 'test_public_key',
    requiresStorage: false,
    subscribedCoreEvents: [],
    database: false,
    manifest: {},
    implementedTasks: [],
    contentHash: 'test_content_hash',
    config: {
      slug,
      label: 'Test App',
      description: 'Test App Description',
      permissions,
      tasks: [],
      runtimeWorkers: {},
    },
    runtimeWorkers: {
      size: 0,
      hash: '',
      manifest: {},
      definitions: {},
    },
    ui: {
      size: 0,
      hash: '',
      manifest: {},
    },
    containerProfiles: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    userScopeEnabledDefault,
    folderScopeEnabledDefault,
    enabled: true,
    permissions,
  }
}

const createMockUserSettings = ({
  appIdentifier,
  userId,
  enabled,
  permissions,
  defaults: {
    folderScopeEnabledDefault = null,
    folderScopePermissionsDefault = null,
  },
}: {
  appIdentifier: string
  userId: string
  enabled: boolean | null
  permissions: UserScopeAppPermissions[] | null
  defaults: {
    folderScopeEnabledDefault: boolean | null
    folderScopePermissionsDefault: FolderScopeAppPermissions[] | null
  }
}): AppUserSettings => {
  return {
    userId,
    appIdentifier,
    enabled,
    folderScopeEnabledDefault,
    folderScopePermissionsDefault,
    permissions,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

const createMockFolderSettings = ({
  appIdentifier,
  folderId,
  enabled = null,
  permissions = null,
}: {
  appIdentifier: string
  folderId: string
  enabled?: boolean | null
  permissions?: FolderScopeAppPermissions[] | null
}): AppFolderSettings => {
  return {
    appIdentifier,
    folderId,
    enabled,
    permissions,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe('resolve-app-settings.util.ts', () => {
  describe('Folder App Settings', () => {
    it('should use user-level fallbacks when folder settings are not set', () => {
      const result = resolveFolderAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: [],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: true,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: false,
            folderScopePermissionsDefault: ['REINDEX_FOLDER'],
          },
        }),
        createMockFolderSettings({
          appIdentifier: 'test_app',
          folderId: '123',
          enabled: null,
          permissions: null,
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: {
          value: false,
          source: 'user',
        },
        permissionsFallback: {
          value: ['REINDEX_FOLDER'],
          source: 'user',
        },
        enabled: null,
        permissions: null,
      })
    })

    it('should use system-level fallbacks when user defaults are not set', () => {
      const result = resolveFolderAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: ['READ_FOLDER_ACL'],
            user: ['CREATE_FOLDERS'],
            folder: ['WRITE_OBJECTS'],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: null,
          },
        }),
        createMockFolderSettings({
          appIdentifier: 'test_app',
          folderId: '123',
          enabled: null,
          permissions: null,
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: {
          value: true,
          source: 'system',
        },
        permissionsFallback: {
          value: ['WRITE_OBJECTS'],
          source: 'system',
        },
        enabled: null,
        permissions: null,
      })
    })

    it('should use explicit folder settings with user-level fallbacks', () => {
      const result = resolveFolderAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: [],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: true,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: false,
            folderScopePermissionsDefault: ['REINDEX_FOLDER'],
          },
        }),
        createMockFolderSettings({
          appIdentifier: 'test_app',
          folderId: '123',
          enabled: false,
          permissions: ['REINDEX_FOLDER'],
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: {
          value: false,
          source: 'user',
        },
        permissionsFallback: {
          value: ['REINDEX_FOLDER'],
          source: 'user',
        },
        enabled: false,
        permissions: ['REINDEX_FOLDER'],
      })
    })

    it('should use explicit folder settings with system-level fallbacks', () => {
      const result = resolveFolderAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: ['READ_FOLDER_ACL'],
            user: ['CREATE_FOLDERS'],
            folder: ['WRITE_OBJECTS'],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: null,
          },
        }),
        createMockFolderSettings({
          appIdentifier: 'test_app',
          folderId: '123',
          enabled: false,
          permissions: ['WRITE_OBJECTS'],
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: {
          value: true,
          source: 'system',
        },
        permissionsFallback: {
          value: ['WRITE_OBJECTS'],
          source: 'system',
        },
        enabled: false,
        permissions: ['WRITE_OBJECTS'],
      })
    })

    it('should use explicit folder settings with user-level fallbacks when permissions differ', () => {
      const result = resolveFolderAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: ['READ_FOLDER_ACL'],
            user: ['CREATE_FOLDERS'],
            folder: ['WRITE_OBJECTS'],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: false,
            folderScopePermissionsDefault: ['WRITE_OBJECTS_METADATA'],
          },
        }),
        createMockFolderSettings({
          appIdentifier: 'test_app',
          folderId: '123',
          enabled: false,
          permissions: ['WRITE_OBJECTS'],
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: {
          value: false,
          source: 'user',
        },
        permissionsFallback: {
          value: ['WRITE_OBJECTS_METADATA'],
          source: 'user',
        },
        enabled: false,
        permissions: ['WRITE_OBJECTS'],
      })
    })

    it('should use mixed fallbacks when only user default enabled is set', () => {
      const result = resolveFolderAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: [],
            folder: ['WRITE_OBJECTS'],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: false,
            folderScopePermissionsDefault: null,
          },
        }),
        createMockFolderSettings({
          appIdentifier: 'test_app',
          folderId: '123',
          enabled: null,
          permissions: null,
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: {
          value: false,
          source: 'user',
        },
        permissionsFallback: {
          value: ['WRITE_OBJECTS'],
          source: 'system',
        },
        enabled: null,
        permissions: null,
      })
    })

    it('should handle folder disabled at the app level with no user or folder settings', () => {
      const result = resolveFolderAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: false,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: [],
            folder: ['WRITE_OBJECTS'],
          },
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: {
          value: false,
          source: 'system',
        },
        permissionsFallback: {
          value: ['WRITE_OBJECTS'],
          source: 'system',
        },
        enabled: null,
        permissions: null,
      })
    })

    it('should use mixed fallbacks when only user default permissions are set', () => {
      const result = resolveFolderAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: [],
            folder: ['WRITE_OBJECTS'],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: ['REINDEX_FOLDER'],
          },
        }),
        createMockFolderSettings({
          appIdentifier: 'test_app',
          folderId: '123',
          enabled: null,
          permissions: null,
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: {
          value: true,
          source: 'system',
        },
        permissionsFallback: {
          value: ['REINDEX_FOLDER'],
          source: 'user',
        },
        enabled: null,
        permissions: null,
      })
    })

    it('should use explicit folder enabled with null permissions and user-level fallbacks', () => {
      const result = resolveFolderAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: [],
            folder: ['WRITE_OBJECTS'],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: false,
            folderScopePermissionsDefault: ['REINDEX_FOLDER'],
          },
        }),
        createMockFolderSettings({
          appIdentifier: 'test_app',
          folderId: '123',
          enabled: true,
          permissions: null,
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: {
          value: false,
          source: 'user',
        },
        permissionsFallback: {
          value: ['REINDEX_FOLDER'],
          source: 'user',
        },
        enabled: true,
        permissions: null,
      })
    })

    it('should use explicit folder permissions with null enabled and system-level fallbacks', () => {
      const result = resolveFolderAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: [],
            folder: ['WRITE_OBJECTS'],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: null,
          },
        }),
        createMockFolderSettings({
          appIdentifier: 'test_app',
          folderId: '123',
          enabled: null,
          permissions: ['WRITE_OBJECTS'],
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: {
          value: true,
          source: 'system',
        },
        permissionsFallback: {
          value: ['WRITE_OBJECTS'],
          source: 'system',
        },
        enabled: null,
        permissions: ['WRITE_OBJECTS'],
      })
    })

    it('should use explicit folder enabled with null permissions and mixed fallbacks', () => {
      const result = resolveFolderAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: [],
            folder: ['WRITE_OBJECTS'],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: false,
            folderScopePermissionsDefault: null,
          },
        }),
        createMockFolderSettings({
          appIdentifier: 'test_app',
          folderId: '123',
          enabled: true,
          permissions: null,
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: {
          value: false,
          source: 'user',
        },
        permissionsFallback: {
          value: ['WRITE_OBJECTS'],
          source: 'system',
        },
        enabled: true,
        permissions: null,
      })
    })

    it('should use explicit folder permissions with null enabled and mixed fallbacks', () => {
      const result = resolveFolderAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: [],
            folder: ['WRITE_OBJECTS'],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: ['REINDEX_FOLDER'],
          },
        }),
        createMockFolderSettings({
          appIdentifier: 'test_app',
          folderId: '123',
          enabled: null,
          permissions: ['WRITE_OBJECTS'],
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: {
          value: true,
          source: 'system',
        },
        permissionsFallback: {
          value: ['REINDEX_FOLDER'],
          source: 'user',
        },
        enabled: null,
        permissions: ['WRITE_OBJECTS'],
      })
    })
  })

  describe('User App Settings', () => {
    it('should return explicit user settings with system fallbacks', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: true,
          permissions: ['CREATE_FOLDERS', 'DELETE_FOLDERS'],
          defaults: {
            folderScopeEnabledDefault: false,
            folderScopePermissionsDefault: ['REINDEX_FOLDER'],
          },
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: true,
        folderScopeEnabledDefaultFallback: true,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: true,
        permissions: ['CREATE_FOLDERS', 'DELETE_FOLDERS'],
        folderScopeEnabledDefault: false,
        folderScopePermissionsDefault: ['REINDEX_FOLDER'],
      })
    })

    it('should return null user settings with system fallbacks', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: false,
          permissions: {
            core: ['READ_FOLDER_ACL'],
            user: ['CREATE_FOLDERS', 'DELETE_FOLDERS'],
            folder: ['WRITE_OBJECTS'],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: null,
          },
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: false,
        folderScopeEnabledDefaultFallback: true,
        permissionsFallback: ['CREATE_FOLDERS', 'DELETE_FOLDERS'],
        enabled: null,
        permissions: null,
        folderScopeEnabledDefault: null,
        folderScopePermissionsDefault: null,
      })
    })

    it('should return explicit enabled setting with null permissions and system fallbacks', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: false,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: true,
            folderScopePermissionsDefault: ['REINDEX_FOLDER'],
          },
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: true,
        folderScopeEnabledDefaultFallback: true,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: false,
        permissions: null,
        folderScopeEnabledDefault: true,
        folderScopePermissionsDefault: ['REINDEX_FOLDER'],
      })
    })

    it('should still return disabled ath folder level when app.userScopeEnabledDefault is false but app.folderScopeEnabledDefault is true', () => {
      const result = resolveFolderAppSettings(
        createMockApp({
          slug: 'test_app',
          userScopeEnabledDefault: false,
          folderScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: {
          value: false,
          source: 'system',
        },
        permissionsFallback: {
          value: [],
          source: 'system',
        },
        enabled: null,
        permissions: null,
      })
    })

    it('should return null enabled setting with explicit permissions and system fallbacks', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: false,
          userScopeEnabledDefault: false,
          permissions: {
            core: ['READ_FOLDER_ACL'],
            user: ['CREATE_FOLDERS'],
            folder: ['WRITE_OBJECTS'],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: ['DELETE_FOLDERS'],
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: null,
          },
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: false,
        folderScopeEnabledDefaultFallback: false,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: null,
        permissions: ['DELETE_FOLDERS'],
        folderScopeEnabledDefault: null,
        folderScopePermissionsDefault: null,
      })
    })

    it('should return user settings with folder scope defaults configured', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: ['WRITE_OBJECTS'],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: true,
          permissions: ['DELETE_FOLDERS'],
          defaults: {
            folderScopeEnabledDefault: false,
            folderScopePermissionsDefault: ['WRITE_OBJECTS_METADATA'],
          },
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: true,
        folderScopeEnabledDefaultFallback: true,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: true,
        permissions: ['DELETE_FOLDERS'],
        folderScopeEnabledDefault: false,
        folderScopePermissionsDefault: ['WRITE_OBJECTS_METADATA'],
      })
    })

    it('should return user settings with no folder scope defaults configured', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: false,
          userScopeEnabledDefault: false,
          permissions: {
            core: ['READ_FOLDER_ACL'],
            user: ['CREATE_FOLDERS', 'DELETE_FOLDERS'],
            folder: ['WRITE_OBJECTS'],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: false,
          permissions: ['DELETE_FOLDERS'],
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: null,
          },
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: false,
        folderScopeEnabledDefaultFallback: false,
        permissionsFallback: ['CREATE_FOLDERS', 'DELETE_FOLDERS'],
        enabled: false,
        permissions: ['DELETE_FOLDERS'],
        folderScopeEnabledDefault: null,
        folderScopePermissionsDefault: null,
      })
    })

    it('should return enabled true with null permissions and no folder defaults', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: true,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: null,
          },
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: true,
        folderScopeEnabledDefaultFallback: true,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: true,
        permissions: null,
        folderScopeEnabledDefault: null,
        folderScopePermissionsDefault: null,
      })
    })

    it('should return enabled false with null permissions and no folder defaults', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: false,
          userScopeEnabledDefault: false,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: false,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: null,
          },
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: false,
        folderScopeEnabledDefaultFallback: false,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: false,
        permissions: null,
        folderScopeEnabledDefault: null,
        folderScopePermissionsDefault: null,
      })
    })

    it('should return null enabled with explicit permissions and folder default enabled only', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: ['DELETE_FOLDERS'],
          defaults: {
            folderScopeEnabledDefault: false,
            folderScopePermissionsDefault: null,
          },
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: true,
        folderScopeEnabledDefaultFallback: true,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: null,
        permissions: ['DELETE_FOLDERS'],
        folderScopeEnabledDefault: false,
        folderScopePermissionsDefault: null,
      })
    })

    it('should return null enabled with explicit permissions and folder default permissions only', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: ['DELETE_FOLDERS'],
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: ['REINDEX_FOLDER'],
          },
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: true,
        folderScopeEnabledDefaultFallback: true,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: null,
        permissions: ['DELETE_FOLDERS'],
        folderScopeEnabledDefault: null,
        folderScopePermissionsDefault: ['REINDEX_FOLDER'],
      })
    })

    it('should return explicit enabled with null permissions and folder default enabled only', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: true,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: false,
            folderScopePermissionsDefault: null,
          },
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: true,
        folderScopeEnabledDefaultFallback: true,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: true,
        permissions: null,
        folderScopeEnabledDefault: false,
        folderScopePermissionsDefault: null,
      })
    })

    it('should return explicit enabled with null permissions and folder default permissions only', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: true,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: ['REINDEX_FOLDER'],
          },
        }),
      )

      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: true,
        folderScopeEnabledDefaultFallback: true,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: true,
        permissions: null,
        folderScopeEnabledDefault: null,
        folderScopePermissionsDefault: ['REINDEX_FOLDER'],
      })
    })

    it('should return folderScopeEnabledDefaultFallback as true when app folderScopeEnabledDefault is true', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: false,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: true,
          permissions: ['DELETE_FOLDERS'],
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: null,
          },
        }),
      )

      expect(result.folderScopeEnabledDefaultFallback).toBe(true)
      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: false,
        folderScopeEnabledDefaultFallback: true,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: true,
        permissions: ['DELETE_FOLDERS'],
        folderScopeEnabledDefault: null,
        folderScopePermissionsDefault: null,
      })
    })

    it('should return folderScopeEnabledDefaultFallback as false when app folderScopeEnabledDefault is false', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: false,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: true,
          permissions: ['DELETE_FOLDERS'],
          defaults: {
            folderScopeEnabledDefault: true,
            folderScopePermissionsDefault: ['REINDEX_FOLDER'],
          },
        }),
      )

      expect(result.folderScopeEnabledDefaultFallback).toBe(false)
      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: true,
        folderScopeEnabledDefaultFallback: false,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: true,
        permissions: ['DELETE_FOLDERS'],
        folderScopeEnabledDefault: true,
        folderScopePermissionsDefault: ['REINDEX_FOLDER'],
      })
    })

    it('should return folderScopeEnabledDefaultFallback independent of user folderScopeEnabledDefault value', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: false,
            folderScopePermissionsDefault: null,
          },
        }),
      )

      expect(result.folderScopeEnabledDefaultFallback).toBe(true)
      expect(result.folderScopeEnabledDefault).toBe(false)
      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: true,
        folderScopeEnabledDefaultFallback: true,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: null,
        permissions: null,
        folderScopeEnabledDefault: false,
        folderScopePermissionsDefault: null,
      })
    })

    it('should return folderScopeEnabledDefaultFallback independent of user enabled value', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: false,
          userScopeEnabledDefault: false,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: true,
          permissions: ['DELETE_FOLDERS'],
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: null,
          },
        }),
      )

      expect(result.folderScopeEnabledDefaultFallback).toBe(false)
      expect(result.enabled).toBe(true)
      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: false,
        folderScopeEnabledDefaultFallback: false,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: true,
        permissions: ['DELETE_FOLDERS'],
        folderScopeEnabledDefault: null,
        folderScopePermissionsDefault: null,
      })
    })

    it('should return folderScopeEnabledDefaultFallback as true with opposite enabledFallback', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: false,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: null,
          },
        }),
      )

      expect(result.folderScopeEnabledDefaultFallback).toBe(true)
      expect(result.enabledFallback).toBe(false)
      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: false,
        folderScopeEnabledDefaultFallback: true,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: null,
        permissions: null,
        folderScopeEnabledDefault: null,
        folderScopePermissionsDefault: null,
      })
    })

    it('should return folderScopeEnabledDefaultFallback as false with opposite enabledFallback', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: false,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: null,
          },
        }),
      )

      expect(result.folderScopeEnabledDefaultFallback).toBe(false)
      expect(result.enabledFallback).toBe(true)
      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: true,
        folderScopeEnabledDefaultFallback: false,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: null,
        permissions: null,
        folderScopeEnabledDefault: null,
        folderScopePermissionsDefault: null,
      })
    })

    it('should return folderScopeEnabledDefaultFallback matching app value with all user settings null', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: true,
          userScopeEnabledDefault: true,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: null,
          permissions: null,
          defaults: {
            folderScopeEnabledDefault: null,
            folderScopePermissionsDefault: null,
          },
        }),
      )

      expect(result.folderScopeEnabledDefaultFallback).toBe(true)
      expect(result.enabledFallback).toBe(true)
      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: true,
        folderScopeEnabledDefaultFallback: true,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: null,
        permissions: null,
        folderScopeEnabledDefault: null,
        folderScopePermissionsDefault: null,
      })
    })

    it('should return folderScopeEnabledDefaultFallback matching app value with all user settings explicit', () => {
      const result = resolveUserAppSettings(
        createMockApp({
          slug: 'test_app',
          folderScopeEnabledDefault: false,
          userScopeEnabledDefault: false,
          permissions: {
            core: [],
            user: ['CREATE_FOLDERS'],
            folder: [],
          },
        }),
        createMockUserSettings({
          appIdentifier: 'test_app',
          userId: '123',
          enabled: true,
          permissions: ['DELETE_FOLDERS'],
          defaults: {
            folderScopeEnabledDefault: true,
            folderScopePermissionsDefault: ['REINDEX_FOLDER'],
          },
        }),
      )

      expect(result.folderScopeEnabledDefaultFallback).toBe(false)
      expect(result.enabledFallback).toBe(false)
      expect(result).toEqual({
        appIdentifier: 'test_app',
        enabledFallback: false,
        folderScopeEnabledDefaultFallback: false,
        permissionsFallback: ['CREATE_FOLDERS'],
        enabled: true,
        permissions: ['DELETE_FOLDERS'],
        folderScopeEnabledDefault: true,
        folderScopePermissionsDefault: ['REINDEX_FOLDER'],
      })
    })
  })
})
