import { z } from 'zod'

export const CORE_APP_IDENTIFIER = 'core'

export const AppSocketMessage = z.enum([
  'GET_WORKER_EXECUTION_DETAILS',
  'SAVE_LOG_ENTRY',
  'GET_APP_STORAGE_SIGNED_URLS',
  'GET_CONTENT_SIGNED_URLS',
  'GET_METADATA_SIGNED_URLS',
  'GET_APP_UI_BUNDLE',
  'UPDATE_CONTENT_METADATA',
  'ATTEMPT_START_HANDLE_ANY_AVAILABLE_TASK',
  'ATTEMPT_START_HANDLE_WORKER_TASK_BY_ID',
  'COMPLETE_HANDLE_TASK',
  'FAIL_HANDLE_TASK',
])

export const AppSocketApiRequest = z.object({
  name: AppSocketMessage,
  data: z.unknown().optional(),
})

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

export const appWorkersArraySchema = z.array(
  z.object({
    description: z.string(),
    identifier: z.string(),
    hash: z.string(),
    environmentVariables: z.record(z.string(), z.string()).optional(),
  }),
)

export const appUILinkSchema = z.object({
  label: z.string(),
  iconPath: z.string().optional(),
  path: z.string(),
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

export const appWorkerScriptConfigSchema = z
  .object({
    description: z.string(),
    environmentVariables: z.record(z.string(), z.string()).optional(),
  })
  .strict()

export const appUIConfigSchema = z
  .object({
    description: z.string(),
  })
  .strict()

export const appUISchema = z.object({
  hash: z.string(),
  description: z.string(),
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

export const appContributionRouteLinkSchema = z
  .object({
    label: z.string().nonempty(),
    uiIdentifier: z.string().nonempty(),
    iconPath: z.string().optional(),
    path: z.string().nonempty(),
  })
  .strict()

export const appContributionsSchema = z
  .object({
    routes: z.array(appContributionRouteLinkSchema),
    sidebarMenuLinks: z.array(appContributionRouteLinkSchema),
    folderActionMenuLinks: z.array(appContributionRouteLinkSchema),
    objectActionMenuLinks: z.array(appContributionRouteLinkSchema),
    folderSidebarEmbeds: z.array(appContributionRouteLinkSchema),
    objectSidebarEmbeds: z.array(appContributionRouteLinkSchema),
  })
  .strict()

export const appConfigSchema = z
  .object({
    requiresStorage: z.boolean().optional(),
    identifier: appIdentifierSchema,
    label: z.string().nonempty().min(1).max(128),
    description: z.string().nonempty().min(1).max(1024),
    emittableEvents: z.array(z.string().nonempty()),
    tasks: z.array(taskConfigSchema),
    externalWorkers: z.array(z.string().nonempty()).optional(),
    workers: z
      .record(
        z
          .string()
          .nonempty()
          .regex(/^[a-z0-9_]+$/)
          .refine((v) => v.toLowerCase() === v),
        appWorkerScriptConfigSchema,
      )
      .optional(),
    ui: z.record(z.string().nonempty(), appUIConfigSchema).optional(),
    contributions: appContributionsSchema.optional(),
  })
  .strict()

export const appWorkerSchema = z.object({
  description: z.string(),
  files: appManifestSchema,
  environmentVariables: z.record(z.string(), z.string()),
  hash: z.string(),
})
export const appWorkersSchema = z.record(z.string(), appWorkerSchema)

export const appWorkersMapSchema = z.record(z.string(), appWorkerSchema)

export const appWorkerScriptIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z0-9_]+$/)

export const appUiIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z0-9_]+$/)
  .refine((v) => v.toLowerCase() === v)

export const appUiArraySchema = z.array(
  appUISchema.merge(
    z.object({
      identifier: appUiIdentifierSchema,
    }),
  ),
)

export const appUiMapSchema = z.record(z.string(), appUISchema)

export const externalAppWorkerSchema = z.object({
  appIdentifier: appIdentifierSchema,
  workerId: z.string(),
  handledTaskIdentifiers: z.array(taskIdentifierSchema),
  socketClientId: z.string(),
  ip: z.string(),
})

export type AppTaskConfig = z.infer<typeof taskConfigSchema>

export type AppWorkersConfig = z.infer<typeof appWorkersSchema>

export type AppUILink = z.infer<typeof appUILinkSchema>

export type AppConfig = z.infer<typeof appConfigSchema>

export type AppWorker = z.infer<typeof appWorkerSchema>

export type AppWorkersMap = z.infer<typeof appWorkersMapSchema>

export type AppUIMap = z.infer<typeof appUiMapSchema>

export type AppManifest = z.infer<typeof appManifestSchema>

export type ExternalAppWorker = z.infer<typeof externalAppWorkerSchema>

export type AppContributions = z.infer<typeof appContributionsSchema>

export type ExternalAppWorkerMap = Record<string, ExternalAppWorker[]>
