import { z } from 'zod'

export interface AppTaskTrigger {
  taskKey: string
  label: string
  description: string
}

export enum ConfigParamType {
  boolean = 'boolean',
  string = 'string',
  number = 'number',
}

export const paramConfigSchema = z.object({
  type: z.nativeEnum(ConfigParamType),
  default: z.union([z.string(), z.number(), z.boolean()]).optional().nullable(),
})

export const eventTriggerSchema = z.object({
  type: z.literal('event'),
  event: z.string(),
  inputParams: z.record(z.string(), z.string()),
})

export const objectActionTriggerSchema = z.object({
  type: z.literal('objectAction'),
  description: z.string(),
  inputParams: z.record(z.string(), z.string()),
})

export const folderActionTriggerSchema = z.object({
  type: z.literal('folderAction'),
  actionLabel: z.string(),
  inputParams: z.record(z.string(), z.string()),
})

export const triggerSchema = z.discriminatedUnion('type', [
  eventTriggerSchema,
  objectActionTriggerSchema,
  folderActionTriggerSchema,
])

export const taskConfigSchema = z.object({
  key: z.string(),
  label: z.string(),
  triggers: z.array(triggerSchema).optional(),
  folderAction: z.object({ description: z.string() }).optional(),
  objectAction: z.object({ description: z.string() }).optional(),
  description: z.string(),
  inputParams: z.record(z.string(), paramConfigSchema).optional(),
  worker: z.string().optional(),
})

export const appWorkersSchema = z.record(z.string(), z.object({}))

export const appMenuItemConfigSchema = z.object({
  label: z.string(),
  iconPath: z.string().optional(),
  uiName: z.string(),
})

export const appIdentitySchema = z.object({
  publicKey: z.string(),
  identifier: z.string(),
})

export const appManifestEntrySchema = z.object({
  hash: z.string(),
  size: z.number(),
  mimeType: z.string(),
})

export const appManifestSchema = z.record(z.string(), appManifestEntrySchema)

export const appWorkerScriptConfigSchema = z.object({
  description: z.string(),
  envVars: z.record(z.string(), z.string()).optional(),
})

export const appUIConfigSchema = z.object({
  description: z.string(),
  menuItems: z.array(appMenuItemConfigSchema),
})

export const appUISchema = z.object({
  description: z.string(),
  menuItems: z.array(appMenuItemConfigSchema),
  files: appManifestSchema,
})

export const appConfigSchema = z.object({
  identifier: z
    .string()
    .nonempty()
    .regex(/^[a-z0-9]+$/)
    .refine((v) => v.toLowerCase() === v),
  label: z.string().nonempty(),
  description: z.string().nonempty(),
  requiresStorage: z.boolean(),
  emittableEvents: z.array(z.string().nonempty()),
  tasks: z.array(taskConfigSchema),
  externalWorkers: z.array(z.string().nonempty()).optional(),
  workerScripts: z
    .record(
      z
        .string()
        .nonempty()
        .regex(/^[a-z0-9_]+$/)
        .refine((v) => v.toLowerCase() === v),
      appWorkerScriptConfigSchema,
    )
    .optional(),
  uis: z.record(z.string().nonempty(), appUIConfigSchema).optional(),
})

export const appWorkerScriptSchema = z.object({
  description: z.string(),
  files: appManifestSchema,
  envVars: z.record(z.string(), z.string()),
})

export const appWorkerScriptMapSchema = z.record(
  z.string(),
  appWorkerScriptSchema,
)

export const appWorkerScriptsSchema = z.array(
  appWorkerScriptSchema.merge(
    z.object({
      identifier: z.string(),
    }),
  ),
)

export const appUIsSchema = z.array(
  appUISchema.merge(
    z.object({
      identifier: z.string(),
    }),
  ),
)

export const appUIMapSchema = z.record(z.string(), appUISchema)

export const externalAppWorkerSchema = z.object({
  appIdentifier: z.string(),
  workerId: z.string(),
  handledTaskKeys: z.array(z.string()),
  socketClientId: z.string(),
  ip: z.string(),
})

export type AppTaskConfig = z.infer<typeof taskConfigSchema>

export type AppWorkersConfig = z.infer<typeof appWorkersSchema>

export type AppMenuItem = z.infer<typeof appMenuItemConfigSchema>

export type AppConfig = z.infer<typeof appConfigSchema>

export type AppWorkerScript = z.infer<typeof appWorkerScriptSchema>

export type AppWorkerScriptMap = z.infer<typeof appWorkerScriptMapSchema>

export type AppUIMap = z.infer<typeof appUIMapSchema>

export type AppManifest = z.infer<typeof appManifestSchema>

export interface ExternalAppWorkerMap {
  [appIdentifier: string]: ExternalAppWorker[]
}

export type ExternalAppWorker = z.infer<typeof externalAppWorkerSchema>
