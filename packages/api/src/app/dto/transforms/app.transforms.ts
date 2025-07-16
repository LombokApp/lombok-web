import type { App } from 'src/app/entities/app.entity'

import type { AppDTO } from '../app.dto'

export function transformAppToDTO(
  app: App,
  externalWorkers: AppDTO['externalWorkers'],
): AppDTO {
  return {
    identifier: app.identifier,
    publicKey: app.publicKey,
    config: app.config,
    manifest: app.manifest,
    externalWorkers,
    workerScripts: Object.keys(app.workerScripts).map(
      (workerScriptIdentifier) => ({
        identifier: workerScriptIdentifier,
        ...app.workerScripts[workerScriptIdentifier],
      }),
    ),
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  }
}
