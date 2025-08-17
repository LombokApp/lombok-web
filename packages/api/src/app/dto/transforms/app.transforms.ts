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
    workerScripts: Object.keys(app.workerScripts).map(
      (workerScriptIdentifier) => ({
        identifier: workerScriptIdentifier,
        ...app.workerScripts[workerScriptIdentifier],
      }),
    ),
    ui: Object.keys(app.ui).map((uiIdentifier) => ({
      identifier: uiIdentifier,
      ...app.ui[uiIdentifier],
    })),
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  }
}
