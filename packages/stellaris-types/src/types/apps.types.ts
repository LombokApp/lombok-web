import z from 'zod'
import {
  appConfigSchema,
  appManifestSchema,
  appMenuItemConfigSchema,
  taskConfigSchema,
} from '../schemas'
export interface AppTaskTrigger {
  taskKey: string
  label: string
  description: string
}

export type AppTaskConfig = z.infer<typeof taskConfigSchema>

export type AppMenuItem = z.infer<typeof appMenuItemConfigSchema>

export type AppConfig = z.infer<typeof appConfigSchema>

export type AppManifest = z.infer<typeof appManifestSchema>

export interface ConnectedAppWorkersMap {
  [appIdentifier: string]: ConnectedAppWorker[] | undefined
}

export const connectedAppWorkerSchema = z.object({
  appIdentifier: z.string(),
  workerId: z.string(),
  handledTaskKeys: z.array(z.string()),
  socketClientId: z.string(),
  ip: z.string(),
})

export type ConnectedAppWorker = z.infer<typeof connectedAppWorkerSchema>
