import { z } from 'zod'

import { PLATFORM_IDENTIFIER } from './platform.types'

export const CORE_APP_IDENTIFIER = 'core'
export const WORKER_TASK_ENQUEUED_EVENT_IDENTIFIER = `${PLATFORM_IDENTIFIER}:worker_task_enqueued`

export const AppSocketMessage = z.enum([
  'DB_QUERY',
  'DB_EXEC',
  'DB_BATCH',
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

export const genericIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z_]+$/)

export const taskIdentifierSchema = genericIdentifierSchema

export const taskConfigSchema = z
  .object({
    identifier: taskIdentifierSchema,
    label: z.string().nonempty().min(1).max(128),
    triggers: z.array(z.string()),
    description: z.string(),
    worker: z.string().optional(),
  })
  .strict()

export const appUILinkSchema = z.object({
  label: z.string(),
  iconPath: z.string().optional(),
  path: z.string(),
})

export const appManifestEntrySchema = z.object({
  hash: z.string(),
  size: z.number(),
  mimeType: z.string(),
})

export const appManifestSchema = z.record(z.string(), appManifestEntrySchema)

export const workerEntrypointSchema = z
  .string()
  .nonempty()
  .refine((path) => !path.startsWith('/'), {
    message: 'Entrypoint must be a relative path (cannot start with "/")',
  })
  .refine((path) => !path.startsWith('./'), {
    message:
      'Entrypoint should not start with "./" (relative paths are implicit)',
  })
  .refine((path) => !path.includes('..'), {
    message: 'Entrypoint cannot contain ".." (parent directory references)',
  })
  .refine((path) => !path.includes('\\'), {
    message: 'Entrypoint must use forward slashes "/" (not backslashes)',
  })
  .refine((path) => path.trim() === path, {
    message: 'Entrypoint cannot have leading or trailing whitespace',
  })
  .refine((path) => !path.includes('//'), {
    message: 'Entrypoint cannot contain consecutive slashes "//"',
  })

export const appWorkerConfigSchema = z
  .object({
    entrypoint: workerEntrypointSchema,
    description: z.string(),
    environmentVariables: z.record(z.string(), z.string()).optional(),
  })
  .strict()

export const appUIConfigSchema = z
  .object({
    description: z.string(),
  })
  .strict()

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

export const appContributionEmbedLinkSchema = z
  .object({
    path: z.string().nonempty().startsWith('/', {
      message: 'Path must start with a forwardslash',
    }),
    label: z.string().nonempty(),
    iconPath: z.string().optional(),
  })
  .strict()

export const appContributionsSchema = z
  .object({
    sidebarMenuLinks: z.array(appContributionEmbedLinkSchema),
    folderSidebarViews: z.array(appContributionEmbedLinkSchema),
    objectSidebarViews: z.array(appContributionEmbedLinkSchema),
    objectDetailViews: z.array(appContributionEmbedLinkSchema),
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
    workers: z
      .record(
        z
          .string()
          .nonempty()
          .regex(/^[a-z0-9_]+$/)
          .refine((v) => v.toLowerCase() === v),
        appWorkerConfigSchema,
      )
      .optional(),
    ui: z.literal(true).optional(),
    database: z.literal(true).optional(),
    contributions: appContributionsSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const workerKeyArray = Object.keys(value.workers ?? {})
    const workerKeys = new Set(workerKeyArray)

    value.tasks.forEach((task, index) => {
      if (task.worker && !workerKeys.has(task.worker)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown worker "${task.worker}". Must be one of: ${workerKeyArray.length > 0 ? workerKeyArray.join(', ') : '(none)'}`,
          path: ['tasks', index, 'worker'],
        })
      }
    })
  })

// Schema that includes manifest validation for worker entrypoints
export const appConfigWithManifestSchema = (
  manifest: Record<string, unknown>,
) =>
  appConfigSchema.superRefine((value, ctx) => {
    if (value.workers) {
      Object.entries(value.workers).forEach(([workerId, workerConfig]) => {
        if (!manifest[`/workers/${workerConfig.entrypoint}`]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Worker "${workerId}" entrypoint "${workerConfig.entrypoint}" does not exist in manifest`,
            path: ['workers', workerId, 'entrypoint'],
          })
        }
      })
    }
  })

export const appWorkerSchema = z.object({
  description: z.string(),
  environmentVariables: z.record(z.string(), z.string()),
  entrypoint: workerEntrypointSchema,
})

export const appWorkersBundleSchema = z.object({
  hash: z.string(),
  size: z.number(),
  manifest: appManifestSchema,
  definitions: z.record(z.string(), appWorkerSchema),
})

export const appUiBundleSchema = z.object({
  hash: z.string(),
  size: z.number(),
  manifest: appManifestSchema,
})

export const appWorkersMapSchema = z.record(z.string(), appWorkerSchema)

export const appWorkerScriptIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z_]+$/)

export const externalAppWorkerSchema = z.object({
  appIdentifier: appIdentifierSchema,
  workerId: z.string(),
  handledTaskIdentifiers: z.array(taskIdentifierSchema),
  socketClientId: z.string(),
  ip: z.string(),
})

export const appMetricsSchema = z.object({
  tasksExecutedLast24Hours: z.object({
    completed: z.number(),
    failed: z.number(),
  }),
  errorsLast24Hours: z.object({
    total: z.number(),
    last10Minutes: z.number(),
  }),
  eventsEmittedLast24Hours: z.object({
    total: z.number(),
    last10Minutes: z.number(),
  }),
})

export type AppTaskConfig = z.infer<typeof taskConfigSchema>

export type AppWorkersBundle = z.infer<typeof appWorkersBundleSchema>

export type AppUILink = z.infer<typeof appUILinkSchema>

export type AppConfig = z.infer<typeof appConfigSchema>

export type AppWorker = z.infer<typeof appWorkerSchema>

export type AppWorkersMap = z.infer<typeof appWorkersMapSchema>

export type AppManifest = z.infer<typeof appManifestSchema>

export type ExternalAppWorker = z.infer<typeof externalAppWorkerSchema>

export type AppContributions = z.infer<typeof appContributionsSchema>

export type ExternalAppWorkerMap = Record<string, ExternalAppWorker[]>

export type AppMetrics = z.infer<typeof appMetricsSchema>

export type AppUiBundle = z.infer<typeof appUiBundleSchema>
