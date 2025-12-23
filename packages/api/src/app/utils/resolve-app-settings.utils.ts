import type { AppFolderSettingsGetResponseDTO } from '../dto/responses/app-folder-settings-get-response.dto'
import type { AppUserSettingsGetResponseDTO } from '../dto/responses/app-user-settings-get-response.dto'
import type { App } from '../entities/app.entity'
import type { AppFolderSettings } from '../entities/app-folder-settings.entity'
import type { AppUserSettings } from '../entities/app-user-settings.entity'

export const resolveFolderAppSettings = (
  app: App,
  userSettings?: AppUserSettings,
  folderSettings?: AppFolderSettings,
): AppFolderSettingsGetResponseDTO['settings'][string] => {
  return {
    appIdentifier: app.identifier,
    enabledFallback:
      userSettings && userSettings.folderScopeEnabledDefault !== null
        ? {
            value: userSettings.folderScopeEnabledDefault,
            source: 'user',
          }
        : {
            value: app.folderScopeEnabledDefault,
            source: 'system',
          },
    permissionsFallback:
      userSettings && userSettings.folderScopePermissionsDefault !== null
        ? {
            value: userSettings.folderScopePermissionsDefault,
            source: 'user',
          }
        : {
            value: app.permissions.folder,
            source: 'system',
          },
    permissions: folderSettings?.permissions ?? null,
    enabled: folderSettings?.enabled ?? null,
  }
}

export const resolveUserAppSettings = (
  app: App,
  userSettings?: AppUserSettings,
): AppUserSettingsGetResponseDTO['settings'] => {
  return {
    appIdentifier: app.identifier,
    folderScopeEnabledDefault: userSettings?.folderScopeEnabledDefault ?? null,
    folderScopePermissionsDefault:
      userSettings?.folderScopePermissionsDefault ?? null,
    enabledFallback: app.userScopeEnabledDefault,
    folderScopeEnabledDefaultFallback: app.folderScopeEnabledDefault,
    permissionsFallback: app.permissions.user,
    permissions: userSettings?.permissions ?? null,
    enabled: userSettings?.enabled ?? null,
  }
}
