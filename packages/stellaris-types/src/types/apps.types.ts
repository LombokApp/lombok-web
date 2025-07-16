import z from 'zod'
import {
  appConfigSchema,
  appManifestSchema,
  appMenuItemConfigSchema,
  appWorkerScriptMapSchema,
  appWorkerScriptSchema,
  appWorkersSchema,
  externalAppWorkerSchema,
  taskConfigSchema,
} from '../schemas'
export interface AppTaskTrigger {
  taskKey: string
  label: string
  description: string
}

export type AppTaskConfig = z.infer<typeof taskConfigSchema>

export type AppWorkersConfig = z.infer<typeof appWorkersSchema>

export type AppMenuItem = z.infer<typeof appMenuItemConfigSchema>

export type AppConfig = z.infer<typeof appConfigSchema>

export type AppWorkerScript = z.infer<typeof appWorkerScriptSchema>

export type AppWorkerScriptMap = z.infer<typeof appWorkerScriptMapSchema>

export type AppManifest = z.infer<typeof appManifestSchema>

export interface ExternalAppWorkerMap {
  [appIdentifier: string]: ExternalAppWorker[]
}

export type ExternalAppWorker = z.infer<typeof externalAppWorkerSchema>
