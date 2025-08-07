import { z } from 'zod'

export const CORE_APP_IDENTIFIER = 'core'
export const APP_NS_PREFIX = 'app:'

export interface AppTaskTrigger {
  taskIdentifier: string
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
export const genericIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z_]+$/)

export const taskIdentifierSchema = genericIdentifierSchema.refine(
  (v) => v.toLowerCase() === v,
  {
    message: 'Task identifier must be lowercase',
  },
)

export const taskConfigSchema = z.object({
  identifier: taskIdentifierSchema,
  label: z.string().nonempty().min(1).max(128),
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

export const appIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z]+$/)
  .refine((v) => v.toLowerCase() === v, {
    message: 'App identifier must be lowercase',
  })
  .refine((v) => v !== 'platform', {
    message: "App identifier cannot be 'platform'",
  })

export const appConfigSchema = z.object({
  identifier: appIdentifierSchema,
  label: z.string().nonempty().min(1).max(128),
  description: z.string().nonempty().min(1).max(1024),
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

export const appWorkerScriptIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z0-9_]+$/)

export const appWorkerScriptsSchema = z.array(
  appWorkerScriptSchema.merge(
    z.object({
      identifier: appWorkerScriptIdentifierSchema,
    }),
  ),
)
export const appUiIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z0-9_]+$/)
  .refine((v) => v.toLowerCase() === v)

export const appUIsSchema = z.array(
  appUISchema.merge(
    z.object({
      identifier: appUiIdentifierSchema,
    }),
  ),
)

export const appUIMapSchema = z.record(z.string(), appUISchema)

export const externalAppWorkerSchema = z.object({
  appIdentifier: appIdentifierSchema,
  workerId: z.string(),
  handledTaskIdentifiers: z.array(taskIdentifierSchema),
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

export type ExternalAppWorker = z.infer<typeof externalAppWorkerSchema>

export type ExternalAppWorkerMap = Record<string, ExternalAppWorker[]>
