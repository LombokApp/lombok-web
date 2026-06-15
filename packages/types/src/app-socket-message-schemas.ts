import { z } from 'zod'

import type { AppSocketMessage } from './apps.types'
import { appMessageErrorSchema } from './apps.types'
import { metadataEntrySchema } from './content.types'
import { LogEntryLevel } from './core.types'
import { eventIdentifierSchema } from './events.types'
import { jsonSerializableObjectSchema } from './json.types'
import { SignedURLsRequestMethod } from './storage.types'
import {
  registerableTriggerConfigSchema,
  storageAccessPolicySchema,
  taskDTOSchema,
  taskOnCompleteConfigSchema,
  taskOnProgressConfigSchema,
  taskProgressReportSchema,
} from './task.types'

export const logEntrySchema = z.object({
  message: z.string().max(1024),
  level: z.enum(LogEntryLevel),
  targetLocation: z
    .object({
      folderId: z.string(),
      objectKey: z.string().optional(),
    })
    .optional(),
  data: jsonSerializableObjectSchema.optional(),
})

export const startContextSchema = jsonSerializableObjectSchema
  .refine((v) => !Object.keys(v).some((key) => key.startsWith('__')))
  .optional()

export const attemptStartHandleTaskSchema = z.object({
  taskIdentifiers: z.array(z.string()),
  startContext: startContextSchema.optional(),
})

export const attemptStartHandleTaskByIdSchema = z.object({
  taskId: z.guid(),
  startContext: startContextSchema.optional(),
})

export const mintAppUserTokenSchema = z.object({
  userId: z.uuid(),
  platformAccess: z.boolean().optional(),
  extra: jsonSerializableObjectSchema.optional(),
})

export const getContentSignedUrlsSchema = z.array(
  z.object({
    folderId: z.string(),
    objectKey: z.string(),
    method: z.enum(SignedURLsRequestMethod),
  }),
)

export const getMetadataSignedUrlsSchema = z.array(
  z.object({
    folderId: z.string(),
    objectKey: z.string(),
    contentHash: z.string(),
    method: z.enum(SignedURLsRequestMethod),
    metadataHash: z.string(),
  }),
)

export const updateMetadataSchema = z.array(
  z.object({
    folderId: z.string(),
    objectKey: z.string(),
    hash: z.string(),
    metadata: z.record(z.string(), metadataEntrySchema),
  }),
)

export const getAppStorageSignedUrlsSchema = z.array(
  z.object({
    objectKey: z.string().min(1),
    method: z.enum(SignedURLsRequestMethod),
    // When set, the URL is signed under that user's partition; otherwise the app's shared partition.
    userId: z.uuid().optional(),
  }),
)

export const dbQuerySchema = z.object({
  sql: z.string(),
  params: z.array(z.unknown()),
  rowMode: z.string().optional(),
})

export const emitEventSchema = z.object({
  eventIdentifier: eventIdentifierSchema,
  data: jsonSerializableObjectSchema,
  targetUserId: z.uuid().optional(),
  targetLocation: z
    .object({
      folderId: z.string(),
      objectKey: z.string().optional(),
    })
    .optional(),
})

export const dbExecSchema = z.object({
  sql: z.string(),
  params: z.array(z.unknown()),
})

export const dbBatchSchema = z.object({
  steps: z.array(
    z.object({
      sql: z.string(),
      params: z.array(z.unknown()),
      kind: z.enum(['query', 'exec']),
      rowMode: z.string().optional(),
    }),
  ),
  atomic: z.boolean(),
})

export const executeAppDockerJobSchema = z.object({
  profileIdentifier: z.string(),
  jobIdentifier: z.string(),
  jobData: jsonSerializableObjectSchema,
  storageAccessPolicy: storageAccessPolicySchema.optional(),
  containerId: z.string().optional(),
  targetUserId: z.string().optional(),
})

export const getAppTaskSchema = z.object({
  taskId: z.uuid(),
  targetUserId: z.uuid().optional(),
})

export const triggerAppTaskSchema = z.object({
  taskIdentifier: z.string(),
  inputData: jsonSerializableObjectSchema,
  correlationKey: z.string().optional(),
  outputLocation: z
    .object({
      folderId: z.string(),
      prefix: z.string().nonempty().nullable(),
    })
    .optional(),
  dontStartBefore: z
    .union([
      z.object({
        timestamp: z.iso.datetime(),
      }),
      z.object({
        delayMs: z.number(),
      }),
    ])
    .optional(),
  targetLocation: z
    .object({
      folderId: z.string(),
      objectKey: z.string().optional(),
    })
    .optional(),
  targetUserId: z.guid().optional(),
  onComplete: taskOnCompleteConfigSchema.array().optional(),
  onProgress: taskOnProgressConfigSchema.array().optional(),
  storageAccessPolicy: storageAccessPolicySchema.optional(),
})

export const reportTaskProgressSchema = z.object({
  taskId: z.guid(),
  progressReport: taskProgressReportSchema,
})

export const getAppCustomSettingsSchema = z.object({
  userId: z.string(),
})

export const patchAppCustomSettingsSchema = z.object({
  userId: z.string(),
  values: z.record(z.string(), z.unknown()),
})

export const createBridgeTunnelSchema = z.object({
  hostId: z.string(),
  containerId: z.string(),
  command: z.array(z.string()).min(1),
  label: z.string().min(1).max(63),
  public: z.boolean().optional(),
  mode: z.enum(['ephemeral', 'persistent']).default('persistent'),
  protocol: z.enum(['framed', 'raw']).default('framed'),
})

export const deleteBridgeTunnelSchema = z.object({
  sessionId: z.string(),
})

export const destroyAppDockerContainersSchema = z.union([
  z.object({
    profileIdentifier: z.string(),
    userId: z.string().optional(),
    containerId: z.string(),
  }),
  z.object({
    profileIdentifier: z.string(),
    userId: z.string().optional(),
    isolationKey: z.string(),
  }),
])

/**
 * Resolve the live container running for a (profile, isolationKey) pair.
 * Class-isolated container profiles spin up at most one container per
 * isolation key per user — this returns the one currently in `running`
 * state, or null if no live container matches. The platform filters out
 * exited / dead matches so callers don't get a zombie pointer.
 */
export const resolveAppDockerContainerSchema = z.object({
  profileIdentifier: z.string(),
  userId: z.string().optional(),
  isolationKey: z.string(),
})

/** Read-only inspect of an app-owned container; reconciles cached status without side effects. */
export const inspectAppDockerContainerSchema = z.object({
  profileIdentifier: z.string(),
  hostId: z.string(),
  containerId: z.string(),
})

/** Start an app-owned stopped container; no-op if already running. */
export const startAppDockerContainerSchema = z.object({
  profileIdentifier: z.string(),
  hostId: z.string(),
  containerId: z.string(),
})

export const registerAppTriggerSchema = z.object({
  trigger: registerableTriggerConfigSchema,
})

export const unregisterAppTriggerSchema = z.object({
  triggerId: z.guid(),
})

export const listAppTriggersSchema = z.object({
  kind: z.enum(['event', 'schedule']).optional(),
})

export const AppSocketMessageSchemaMap = {
  EMIT_EVENT: emitEventSchema,
  SAVE_LOG_ENTRY: logEntrySchema,
  GET_CONTENT_SIGNED_URLS: getContentSignedUrlsSchema,
  MINT_APP_USER_TOKEN: mintAppUserTokenSchema,
  GET_METADATA_SIGNED_URLS: getMetadataSignedUrlsSchema,
  UPDATE_CONTENT_METADATA: updateMetadataSchema,
  GET_LATEST_DB_CREDENTIALS: z.undefined(),
  GET_APP_STORAGE_SIGNED_URLS: getAppStorageSignedUrlsSchema,
  EXECUTE_APP_DOCKER_JOB: executeAppDockerJobSchema,
  EXECUTE_APP_DOCKER_JOB_ASYNC: executeAppDockerJobSchema,
  GET_APP_TASK: getAppTaskSchema,
  TRIGGER_APP_TASK: triggerAppTaskSchema,
  REPORT_TASK_PROGRESS: reportTaskProgressSchema,
  GET_APP_CUSTOM_SETTINGS: getAppCustomSettingsSchema,
  PATCH_APP_CUSTOM_SETTINGS: patchAppCustomSettingsSchema,
  CREATE_BRIDGE_TUNNEL: createBridgeTunnelSchema,
  DELETE_BRIDGE_TUNNEL: deleteBridgeTunnelSchema,
  DESTROY_APP_DOCKER_CONTAINERS: destroyAppDockerContainersSchema,
  RESOLVE_APP_DOCKER_CONTAINER: resolveAppDockerContainerSchema,
  INSPECT_APP_DOCKER_CONTAINER: inspectAppDockerContainerSchema,
  START_APP_DOCKER_CONTAINER: startAppDockerContainerSchema,
  REGISTER_APP_TRIGGER: registerAppTriggerSchema,
  UNREGISTER_APP_TRIGGER: unregisterAppTriggerSchema,
  LIST_APP_TRIGGERS: listAppTriggersSchema,
} as const satisfies Record<z.infer<typeof AppSocketMessage>, z.ZodType>

export type AppSocketMessageDataMap = {
  [K in keyof typeof AppSocketMessageSchemaMap]: z.infer<
    (typeof AppSocketMessageSchemaMap)[K]
  >
}

export const createResponseSchema = <T extends z.ZodType>(resultSchema: T) =>
  z.union([
    z.object({
      result: resultSchema,
    }),
    z.object({
      error: appMessageErrorSchema,
    }),
  ])

export const executeAppDockerJobResponseSchema = createResponseSchema(
  z.union([
    z.object({
      // submitted and execution succeeded
      jobId: z.string(),
      submitSuccess: z.literal(true),
      containerId: z.string(),
      execution: z.object({
        success: z.literal(true),
        result: jsonSerializableObjectSchema,
      }),
    }),
    z.object({
      // submit failed
      jobId: z.string().nullable(),
      submitSuccess: z.literal(false),
      submitError: appMessageErrorSchema,
      containerId: z.string().nullable(),
      execution: z.null(),
    }),
    z.object({
      // submitted but execution failed
      jobId: z.string(),
      submitSuccess: z.literal(true),
      containerId: z.string(),
      execution: z.object({
        success: z.literal(false),
        error: appMessageErrorSchema,
        result: z.null(),
      }),
    }),
  ]),
)

export const executeAppDockerJobAsyncResponseSchema = createResponseSchema(
  z.union([
    z.object({
      // submit succeeded
      jobId: z.string(),
      submitSuccess: z.literal(true),
      containerId: z.string(),
    }),
    z.object({
      // submit failed
      jobId: z.string().nullable(),
      submitSuccess: z.literal(false),
      submitError: appMessageErrorSchema,
      containerId: z.string().nullable(),
    }),
  ]),
)

const signedUrlSchema = z.object({
  url: z.string(),
  folderId: z.string(),
  objectKey: z.string(),
})

export const AppSocketMessageResponseSchemaMap = {
  EMIT_EVENT: createResponseSchema(
    z.object({
      success: z.boolean(),
    }),
  ),
  SAVE_LOG_ENTRY: createResponseSchema(z.null()),
  GET_CONTENT_SIGNED_URLS: createResponseSchema(z.array(signedUrlSchema)),
  MINT_APP_USER_TOKEN: createResponseSchema(
    z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
    }),
  ),
  GET_METADATA_SIGNED_URLS: createResponseSchema(z.array(signedUrlSchema)),
  UPDATE_CONTENT_METADATA: createResponseSchema(z.null()),
  GET_APP_STORAGE_SIGNED_URLS: createResponseSchema(z.array(z.string())),
  EXECUTE_APP_DOCKER_JOB: executeAppDockerJobResponseSchema,
  EXECUTE_APP_DOCKER_JOB_ASYNC: executeAppDockerJobAsyncResponseSchema,
  GET_APP_TASK: createResponseSchema(taskDTOSchema),
  TRIGGER_APP_TASK: createResponseSchema(z.object({ taskId: z.string() })),
  REPORT_TASK_PROGRESS: createResponseSchema(
    z.object({ success: z.boolean() }),
  ),
  GET_APP_CUSTOM_SETTINGS: createResponseSchema(
    z.object({ values: z.record(z.string(), z.unknown()) }),
  ),
  PATCH_APP_CUSTOM_SETTINGS: createResponseSchema(
    z.object({ success: z.boolean() }),
  ),
  GET_LATEST_DB_CREDENTIALS: createResponseSchema(
    z.object({
      host: z.string(),
      user: z.string(),
      password: z.string(),
      database: z.string(),
      ssl: z.boolean(),
      port: z.number(),
    }),
  ),
  CREATE_BRIDGE_TUNNEL: createResponseSchema(
    z.object({
      public: z
        .object({
          id: z.string(),
          url: z.string(),
        })
        .optional(),
      sessionId: z.string(),
      token: z.string(),
      urls: z.object({
        ws: z.string(),
        http: z.string(),
      }),
    }),
  ),
  DELETE_BRIDGE_TUNNEL: createResponseSchema(
    z.object({ success: z.boolean() }),
  ),
  DESTROY_APP_DOCKER_CONTAINERS: createResponseSchema(
    z.object({ destroyedCount: z.number() }),
  ),
  RESOLVE_APP_DOCKER_CONTAINER: createResponseSchema(
    z.object({ hostId: z.string(), containerId: z.string() }).nullable(),
  ),
  INSPECT_APP_DOCKER_CONTAINER: createResponseSchema(
    z.object({
      state: z.enum(['running', 'stopped', 'missing', 'unknown']),
    }),
  ),
  START_APP_DOCKER_CONTAINER: createResponseSchema(
    z.object({
      state: z.enum(['running', 'missing', 'unknown']),
      started: z.boolean(),
    }),
  ),
  REGISTER_APP_TRIGGER: createResponseSchema(
    z.object({ triggerId: z.string() }),
  ),
  UNREGISTER_APP_TRIGGER: createResponseSchema(
    z.object({ success: z.boolean() }),
  ),
  LIST_APP_TRIGGERS: createResponseSchema(
    z.object({
      triggers: z.array(
        z.object({
          id: z.string(),
          kind: z.enum(['event', 'schedule']),
          definition: registerableTriggerConfigSchema,
        }),
      ),
    }),
  ),
} as const satisfies Record<z.infer<typeof AppSocketMessage>, z.ZodType>

export type AppSocketResponseError = z.infer<typeof appMessageErrorSchema>

export type AppSocketMessageResponseMap = {
  [K in keyof typeof AppSocketMessageResponseSchemaMap]: z.infer<
    (typeof AppSocketMessageResponseSchemaMap)[K]
  >
}

export type AppSocketMessageResultMap = {
  [K in keyof AppSocketMessageResponseMap]: AppSocketMessageResponseMap[K]
}
