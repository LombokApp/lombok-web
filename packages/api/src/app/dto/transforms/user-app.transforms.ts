import type { App } from 'src/app/entities/app.entity'

import type { UserAppDTO } from '../user-app.dto'

export function transformAppToUserDTO(
  app: App,
  userEnabled: boolean | null,
): UserAppDTO {
  return {
    id: app.id,
    identifier: app.identifier,
    label: app.label,
    config: app.config,
    manifest: app.manifest,
    enabled: app.enabled,
    userScopeEnabledDefault: app.userScopeEnabledDefault,
    userEnabled,
    folderScopeEnabledDefault: app.folderScopeEnabledDefault,
    runtimeWorkers: app.runtimeWorkers,
    contributions: app.config.contributions ?? {
      uiEntrypoints: [],
      folderSidebarViews: [],
      objectSidebarViews: [],
      objectDetailViews: [],
      folderDetailViews: [],
    },
    ui: app.ui,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  }
}
