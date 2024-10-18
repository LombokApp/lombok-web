import z from 'zod'
import {
  appConfigSchema,
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

export interface ConnectedAppInstancesMap {
  [appIdentifier: string]: ConnectedAppInstance[] | undefined
}

export interface ConnectedAppInstance {
  appIdentifier: string
  socketClientId: string
  name: string
  ip: string
}

export interface AppData {
  identifier: string
  config: AppConfig
}
