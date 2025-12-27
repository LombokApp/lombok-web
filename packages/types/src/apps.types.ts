import { z } from 'zod'

import type { LombokApiClient } from './api.types'
import { platformPrefixedEventIdentifierSchema } from './events.types'
import {
  appIdentifierSchema,
  slugSchema,
  taskIdentifierSchema,
} from './identifiers.types'
import { jsonSerializableObjectDTOSchema } from './json.types'
import type { TaskOnCompleteConfig } from './task.types'
import { taskConfigSchema, taskTriggerConfigSchema } from './task.types'

export const CORE_APP_SLUG = 'core'

export const AppSocketMessage = z.enum([
  'GET_LATEST_DB_CREDENTIALS',
  'GET_WORKER_EXECUTION_DETAILS',
  'SAVE_LOG_ENTRY',
  'GET_APP_STORAGE_SIGNED_URLS',
  'GET_CONTENT_SIGNED_URLS',
  'GET_METADATA_SIGNED_URLS',
  'GET_APP_UI_BUNDLE',
  'GET_APP_USER_ACCESS_TOKEN',
  'UPDATE_CONTENT_METADATA',
  'ATTEMPT_START_HANDLE_ANY_AVAILABLE_TASK',
  'ATTEMPT_START_HANDLE_WORKER_TASK_BY_ID',
  'COMPLETE_HANDLE_TASK',
  'AUTHENTICATE_USER',
  'EMIT_EVENT',
  'EXECUTE_APP_DOCKER_JOB',
  'TRIGGER_APP_TASK',
])

export const EXECUTE_SYSTEM_REQUEST_MESSAGE = 'EXECUTE_SYSTEM_REQUEST'

export const appMessageErrorSchema = z.object({
  code: z.union([z.number(), z.string()]),
  message: z.string(),
  details: jsonSerializableObjectDTOSchema.optional(),
})

export type WorkerApiActor =
  | {
      actorType: 'user'
      userId?: string
      userApiClient: LombokApiClient
    }
  | {
      actorType: 'system'
    }

export const appSocketMessageSchema = z.object({
  name: AppSocketMessage,
  data: z.unknown(),
})

export type AppSocketApiRequest = z.infer<typeof appSocketMessageSchema>

export enum ConfigParamType {
  boolean = 'boolean',
  string = 'string',
  number = 'number',
}

export const paramConfigSchema = z.object({
  type: z.nativeEnum(ConfigParamType),
  default: z.union([z.string(), z.number(), z.boolean()]).optional().nullable(),
})

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

// Permissions that can be granted to an app for the platform
export const platformScopeAppPermissionsSchema = z.enum([
  'READ_FOLDER_ACL', // Read the user <-> folder ACL context
  'SERVE_APPS', // Serve other apps
])

// Permissions that can be granted to an app for a specific user
export const userScopeAppPermissionsSchema = z.enum([
  'CREATE_FOLDERS', // create a new folder
  'READ_FOLDERS', // get/list folders
  'UPDATE_FOLDERS', // update a folder (name)
  'DELETE_FOLDERS', // delete a folder
  'READ_USER', // get user details
])

// Permissions that can be granted to an app for a specific folder
export const folderScopeAppPermissionsSchema = z.enum([
  'READ_OBJECTS', // get/list objects and their metadata
  'WRITE_OBJECTS', // create/update/delete objects
  'WRITE_OBJECTS_METADATA', // create/update/delete object metadata
  'WRITE_FOLDER_METADATA', // create/update/delete folder metadata
  'REINDEX_FOLDER',
])

export type PlatformScopeAppPermissions = z.infer<
  typeof platformScopeAppPermissionsSchema
>
export type UserScopeAppPermissions = z.infer<
  typeof userScopeAppPermissionsSchema
>
export type FolderScopeAppPermissions = z.infer<
  typeof folderScopeAppPermissionsSchema
>

export const containerProfileResourceHintsSchema = z
  .object({
    gpu: z.boolean().optional(),
    memoryMB: z.number().positive().optional(),
    cpuCores: z.number().positive().optional(),
  })
  .strict()

export const dockerWorkerCommandSchema = z.array(z.string().nonempty())

export const dockerWorkerJobIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z_]+$/)

export const containerProfileJobDefinitionSchema = z
  .object({
    maxPerContainer: z.number().min(1).optional(),
    countTowardsGlobalCap: z.literal(false).optional(),
    priority: z.number().optional(),
  })
  .strict()

export const httpJobDefinitionSchema =
  containerProfileJobDefinitionSchema.merge(
    z.object({ identifier: dockerWorkerJobIdentifierSchema }),
  )

export const execJobDefinitionSchema = z
  .object({
    kind: z.literal('exec'),
    command: dockerWorkerCommandSchema,
    jobIdentifier: dockerWorkerJobIdentifierSchema,
  })
  .merge(containerProfileJobDefinitionSchema)

export const dockerWorkerConfigSchema = z.discriminatedUnion('kind', [
  execJobDefinitionSchema,
  z.object({
    kind: z.literal('http'),
    command: dockerWorkerCommandSchema,
    port: z.number().positive().max(65535),
    jobs: z.array(httpJobDefinitionSchema),
  }),
])

export const containerProfileConfigSchema = z
  .object({
    image: z.string(),
    // environmentVariables: z.record(z.string(), z.string()).optional(),
    // Resource hints (optional suggestions, not hard limits)
    resources: containerProfileResourceHintsSchema.optional(),
    // Desired concurrency hints
    // desiredContainers: z.number().positive().optional(),
    // desiredMaxJobsPerContainer: z.number().positive().optional(),
    // jobClasses: z.record(z.string(), containerProfileJobClassSchema),
    workers: z.array(dockerWorkerConfigSchema),
  })
  .strict()

export const appProfileIdentifierSchema = z
  .string()
  .nonempty()
  .regex(/^[a-z_]+$/)
  .refine((v) => v.toLowerCase() === v)

export const appConfigSchema = z
  .object({
    requiresStorage: z.boolean().optional(),
    permissions: z
      .object({
        platform: z.array(platformScopeAppPermissionsSchema).optional(),
        user: z.array(userScopeAppPermissionsSchema).optional(),
        folder: z.array(folderScopeAppPermissionsSchema).optional(),
      })
      .optional(),
    slug: slugSchema,
    label: z.string().nonempty().min(1).max(128),
    description: z.string().nonempty().min(1).max(1024),
    subscribedPlatformEvents: z
      .array(platformPrefixedEventIdentifierSchema)
      .optional(),
    triggers: z.array(taskTriggerConfigSchema).optional(),
    tasks: z.array(taskConfigSchema).optional(),
    containerProfiles: z
      .record(appProfileIdentifierSchema, containerProfileConfigSchema)
      .optional(),
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
    ui: z
      .object({
        enabled: z.literal(true),
        csp: z.string().optional(),
      })
      .optional(),
    database: z
      .object({
        enabled: z.literal(true),
      })
      .optional(),
    contributions: appContributionsSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const workerIdentifiersArray = Object.keys(value.workers ?? {})
    const workerIdentifiers = new Set(workerIdentifiersArray)
    const taskIdentifiersArray = value.tasks?.map((t) => t.identifier) ?? []
    const taskIdentifiers = new Set(taskIdentifiersArray)
    const containerProfilesKeys = Object.keys(value.containerProfiles ?? {})
    const containerWorkerJobDefinitions = containerProfilesKeys.reduce<
      Record<string, { workerIndex: number; jobIdentifier: string }[]>
    >((acc, profileIdentifier) => {
      const profile = value.containerProfiles?.[profileIdentifier]
      if (!profile) {
        return acc
      }

      const profileJobDefinitions = profile.workers.flatMap(
        (worker, workerIndex) =>
          worker.kind === 'http'
            ? worker.jobs.map(({ identifier: jobIdentifier }) => ({
                workerIndex,
                jobIdentifier,
              }))
            : { workerIndex, jobIdentifier: worker.jobIdentifier },
      )

      return {
        ...acc,
        [profileIdentifier]: profileJobDefinitions,
      }
    }, {})

    Object.entries(containerWorkerJobDefinitions).forEach(
      ([profileIdentifier, jobDefinitions]) => {
        const jobIdentifiers = new Set<string>()

        jobDefinitions.forEach(({ workerIndex, jobIdentifier }) => {
          if (jobIdentifiers.has(jobIdentifier)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Duplicate container job name "${jobIdentifier}" in profile "${profileIdentifier}". Each job name within a container profile must be unique.`,
              path: [
                'containerProfiles',
                profileIdentifier,
                'workers',
                workerIndex,
              ],
            })
          } else {
            jobIdentifiers.add(jobIdentifier)
          }
        })
      },
    )

    value.tasks?.forEach((task, index) => {
      if (
        task.handler.type === 'worker' &&
        !workerIdentifiers.has(task.handler.identifier)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown worker "${task.handler.identifier}" in task "${task.identifier}". Must be one of: ${workerIdentifiersArray.length > 0 ? workerIdentifiersArray.join(', ') : '(none)'}`,
          path: ['tasks', index, 'worker'],
        })
      } else if (task.handler.type === 'docker') {
        const profile = task.handler.identifier.split(':')[0]
        const jobIdentifier = task.handler.identifier.split(':')[1]
        if (
          // Profile is not defined
          !profile ||
          !containerProfilesKeys.includes(profile)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown container profile "${profile}". Must be one of: ${containerProfilesKeys.length > 0 ? containerProfilesKeys.join(', ') : '(none)'}`,
            path: ['tasks', index, 'worker'],
          })
          return
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const profileJobDefinitions = containerWorkerJobDefinitions[profile]!
        if (
          // Job is not defined
          !profileJobDefinitions.some(
            (jobDefinition) =>
              task.handler.type === 'docker' &&
              jobDefinition.jobIdentifier === jobIdentifier,
          )
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown container job class "${jobIdentifier}". Must be one of: ${profileJobDefinitions.map((jobDefinition) => jobDefinition.jobIdentifier).join(', ')}`,
            path: ['tasks', index, 'worker'],
          })
        }
      }
    })
    const validateOnCompleteTaskIdentifiers = (
      onComplete: {
        taskIdentifier?: string
        onComplete?: TaskOnCompleteConfig[]
      }[],
      triggerIndex: number,
      path: (string | number)[],
    ) => {
      onComplete.forEach((onCompleteConfig, onCompleteIndex) => {
        if (
          onCompleteConfig.taskIdentifier &&
          !taskIdentifiers.has(onCompleteConfig.taskIdentifier)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown task "${onCompleteConfig.taskIdentifier}" in trigger at index ${triggerIndex}. Must be one of: ${
              taskIdentifiersArray.length > 0
                ? taskIdentifiersArray.join(', ')
                : '(none)'
            }`,
            path: [...path, onCompleteIndex, 'taskIdentifier'],
          })
        }

        if (onCompleteConfig.onComplete) {
          validateOnCompleteTaskIdentifiers(
            onCompleteConfig.onComplete,
            triggerIndex,
            [...path, onCompleteIndex, 'onComplete'],
          )
        }
      })
    }

    ;(value.triggers ?? []).forEach((trigger, index) => {
      if (
        trigger.kind === 'event' &&
        trigger.eventIdentifier.startsWith('platform:') &&
        !value.subscribedPlatformEvents?.includes(trigger.eventIdentifier)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Platform event identifier "${trigger.eventIdentifier}" in trigger at index ${index} is not subscribed to by the app`,
          path: ['triggers', index, 'eventIdentifier'],
        })
      }

      if (!taskIdentifiers.has(trigger.taskIdentifier)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown task "${trigger.taskIdentifier}" in trigger at index ${index}. Must be one of: ${
            taskIdentifiersArray.length > 0
              ? taskIdentifiersArray.join(', ')
              : '(none)'
          }`,
          path: ['triggers', index, 'taskIdentifier'],
        })
      }

      if (trigger.onComplete) {
        validateOnCompleteTaskIdentifiers(trigger.onComplete, index, [
          'triggers',
          index,
          'onComplete',
        ])
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
  csp: z.string().optional(),
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

export type ContainerProfileConfig = z.infer<
  typeof containerProfileConfigSchema
>

export type ContainerProfileJobDefinition = z.infer<
  typeof containerProfileJobDefinitionSchema
>

export type ContainerProfileResourceHints = z.infer<
  typeof containerProfileResourceHintsSchema
>

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
