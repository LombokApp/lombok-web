import type { App } from 'src/app/entities/app.entity'

import type { AppDTO } from '../app.dto'

export function transformAppToDTO(
  app: App,
  connectedWorkers: AppDTO['connectedWorkers'],
): AppDTO {
  return {
    identifier: app.identifier,
    publicKey: app.publicKey,
    config: app.config,
    manifest: app.manifest,
    connectedWorkers,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  }
}
