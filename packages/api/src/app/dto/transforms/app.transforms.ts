import type { App } from 'src/app/entities/app.entity'

import type { AdminAppDTO } from '../admin-app.dto'

export function transformAppToDTO(
  app: App,
  connectedRuntimeWorkers: AdminAppDTO['connectedRuntimeWorkers'],
): AdminAppDTO {
  return {
    identifier: app.identifier,
    slug: app.slug,
    label: app.label,
    publicKey: app.publicKey,
    config: app.config,
    manifest: app.manifest,
    connectedRuntimeWorkers,
    requiresStorage: app.requiresStorage,
    enabled: app.enabled,
    userScopeEnabledDefault: app.userScopeEnabledDefault,
    folderScopeEnabledDefault: app.folderScopeEnabledDefault,
    runtimeWorkers: app.runtimeWorkers,
    contributions: app.config.contributions ?? {
      sidebarMenuLinks: [],
      folderSidebarViews: [],
      objectSidebarViews: [],
      objectDetailViews: [],
      folderDetailViews: [],
    },
    ui: app.ui,
    metrics: null,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  }
}
