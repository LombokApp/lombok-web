import type { App } from 'src/app/entities/app.entity'

import type { AppDTO } from '../app.dto'

export function transformAppToDTO(
  app: App,
  externalWorkers: AppDTO['externalWorkers'],
): AppDTO {
  return {
    identifier: app.identifier,
    label: app.label,
    publicKey: app.publicKey,
    config: app.config,
    manifest: app.manifest,
    externalWorkers,
    requiresStorage: app.requiresStorage,
    enabled: app.enabled,
    workers: app.workers,
    contributions: app.config.contributions ?? {
      sidebarMenuLinks: [],
      folderSidebarViews: [],
      objectSidebarViews: [],
      objectDetailViews: [],
    },
    ui: app.ui ?? null,
    metrics: null,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  }
}
