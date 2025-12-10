import type { App } from 'src/app/entities/app.entity'

import type { UserAppDTO } from '../user-app.dto'

export function transformAppToUserDTO(app: App): UserAppDTO {
  return {
    identifier: app.identifier,
    label: app.label,
    config: app.config,
    manifest: app.manifest,
    enabled: app.enabled,
    userScopeEnabledDefault: app.userScopeEnabledDefault,
    folderScopeEnabledDefault: app.folderScopeEnabledDefault,
    workers: app.workers,
    contributions: app.config.contributions ?? {
      sidebarMenuLinks: [],
      folderSidebarViews: [],
      objectSidebarViews: [],
      objectDetailViews: [],
    },
    ui: app.ui,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  }
}
