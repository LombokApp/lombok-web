import type { AppFolderSettingsGetResponseDTO } from '../dto/responses/app-folder-settings-get-response.dto'
import type { AppUserSettingsGetResponseDTO } from '../dto/responses/app-user-settings-get-response.dto'
import type { App } from '../entities/app.entity'
import type { AppFolderSettings } from '../entities/app-folder-settings.entity'
import type { AppUserSettings } from '../entities/app-user-settings.entity'

type ResolvedFolderAppSettings =
  AppFolderSettingsGetResponseDTO['settings'][string]

export const resolveFolderAppSettings = (
  app: App,
  userSettings?: AppUserSettings,
  folderSettings?: AppFolderSettings,
): ResolvedFolderAppSettings => {
  const explicitUserSettings = !!userSettings
  const explicitFolderSettings = !!folderSettings

  const hasFolderEnabledDefaultAtUserLevel =
    typeof userSettings?.folderScopeEnabledDefault === 'boolean'

  const enablednessExplicitlySetAtFolderLevel =
    explicitFolderSettings &&
    typeof folderSettings.enabled !== 'undefined' &&
    folderSettings.enabled !== null

  const folderPermissionsExplicitlySetAtUserLevel =
    explicitUserSettings &&
    typeof userSettings.folderScopePermissionsDefault !== 'undefined' &&
    userSettings.folderScopePermissionsDefault !== null

  const folderPermissionsExplicitlySetAtFolderLevel =
    explicitFolderSettings &&
    typeof folderSettings.permissions !== 'undefined' &&
    folderSettings.permissions !== null

  const explicitlyDisabledAtUserLevel = userSettings?.enabled === false

  const resolved: ResolvedFolderAppSettings = {
    appIdentifier: app.identifier,
    enabledFallback: hasFolderEnabledDefaultAtUserLevel
      ? {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          value: userSettings.folderScopeEnabledDefault!,
          source: 'user',
        }
      : {
          value: app.userScopeEnabledDefault && app.folderScopeEnabledDefault,
          source: 'system',
        },
    permissionsFallback: folderPermissionsExplicitlySetAtUserLevel
      ? {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          value: userSettings.folderScopePermissionsDefault!,
          source: 'user',
        }
      : {
          value: app.permissions.folder,
          source: 'system',
        },
    permissions: folderPermissionsExplicitlySetAtFolderLevel
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        folderSettings.permissions!
      : null,
    enabled:
      !explicitlyDisabledAtUserLevel && enablednessExplicitlySetAtFolderLevel
        ? folderSettings.enabled
        : null,
  }
  return resolved
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
