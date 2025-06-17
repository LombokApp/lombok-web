import z from 'zod'
import {
  appConfigSchema,
  appManifestSchema,
  appMenuItemConfigSchema,
  appWorkersSchema,
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

export type AppManifest = z.infer<typeof appManifestSchema>

export interface ConnectedAppInstancesMap {
  [appIdentifier: string]: ConnectedAppInstance[]
}

export const connectedAppInstanceSchema = z.object({
  appIdentifier: z.string(),
  workerId: z.string(),
  handledTaskKeys: z.array(z.string()),
  socketClientId: z.string(),
  ip: z.string(),
})

export type ConnectedAppInstance = z.infer<typeof connectedAppInstanceSchema>
