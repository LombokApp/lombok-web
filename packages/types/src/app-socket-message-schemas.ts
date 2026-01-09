import type { ZodSchema, ZodTypeAny } from 'zod'
import { z } from 'zod'

import type { AppSocketMessage } from './apps.types'
import { appMessageErrorSchema } from './apps.types'
import { metadataEntrySchema } from './content.types'
import { LogEntryLevel } from './core.types'
import { eventIdentifierSchema } from './events.types'
import { jsonSerializableObjectSchema } from './json.types'
import { SignedURLsRequestMethod } from './storage.types'
import {
  storageAccessPolicySchema,
  taskOnCompleteConfigSchema,
} from './task.types'

export const logEntrySchema = z.object({
  message: z.string().max(1024),
  level: z.nativeEnum(LogEntryLevel),
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
  taskId: z.string().uuid(),
  startContext: startContextSchema.optional(),
})

export const getAppUserAccessTokenSchema = z.object({
  userId: z.string().uuid(),
})

export const getContentSignedUrlsSchema = z.array(
  z.object({
    folderId: z.string(),
    objectKey: z.string(),
    method: z.nativeEnum(SignedURLsRequestMethod),
  }),
)

export const getMetadataSignedUrlsSchema = z.array(
  z.object({
    folderId: z.string(),
    objectKey: z.string(),
    contentHash: z.string(),
    method: z.nativeEnum(SignedURLsRequestMethod),
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
    method: z.nativeEnum(SignedURLsRequestMethod),
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

export const authenticateUserSchema = z.object({
  token: z.string(),
  appIdentifier: z.string(),
})

export const executeAppDockerJobSchema = z.object({
  profileIdentifier: z.string(),
  jobIdentifier: z.string(),
  jobData: jsonSerializableObjectSchema,
  storageAccessPolicy: storageAccessPolicySchema.optional(),
})

export const triggerAppTaskSchema = z.object({
  taskIdentifier: z.string(),
  inputData: jsonSerializableObjectSchema,
  dontStartBefore: z
    .union([
      z.object({
        timestamp: z.string().datetime(),
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
  targetUserId: z.string().uuid().optional(),
  onComplete: taskOnCompleteConfigSchema.array().optional(),
  storageAccessPolicy: storageAccessPolicySchema.optional(),
})

export const AppSocketMessageSchemaMap = {
  EMIT_EVENT: emitEventSchema,
  SAVE_LOG_ENTRY: logEntrySchema,
  GET_CONTENT_SIGNED_URLS: getContentSignedUrlsSchema,
  GET_APP_USER_ACCESS_TOKEN: getAppUserAccessTokenSchema,
  GET_METADATA_SIGNED_URLS: getMetadataSignedUrlsSchema,
  UPDATE_CONTENT_METADATA: updateMetadataSchema,
  GET_LATEST_DB_CREDENTIALS: z.undefined(),
  GET_APP_STORAGE_SIGNED_URLS: getAppStorageSignedUrlsSchema,
  AUTHENTICATE_USER: authenticateUserSchema,
  EXECUTE_APP_DOCKER_JOB: executeAppDockerJobSchema,
  TRIGGER_APP_TASK: triggerAppTaskSchema,
} as const satisfies Record<z.infer<typeof AppSocketMessage>, ZodTypeAny>

export type AppSocketMessageDataMap = {
  [K in keyof typeof AppSocketMessageSchemaMap]: z.infer<
    (typeof AppSocketMessageSchemaMap)[K]
  >
}

export const createResponseSchema = <T extends ZodTypeAny>(resultSchema: T) =>
  z.union([
    z.object({
      result: resultSchema,
    }),
    z.object({
      error: appMessageErrorSchema,
    }),
  ])

export const executeAppDockerJobResponseSchema = createResponseSchema(
  z.discriminatedUnion('jobSuccess', [
    z.object({
      jobId: z.string(),
      jobSuccess: z.literal(true),
      jobResult: jsonSerializableObjectSchema,
    }),
    z.object({
      jobId: z.string(),
      jobSuccess: z.literal(false),
      jobResult: z.union([
        z.object({
          submitError: appMessageErrorSchema,
        }),
        z.object({
          jobError: appMessageErrorSchema,
        }),
      ]),
    }),
  ]),
)

export const buildExecuteAppDockerJobResponseSchema = <T extends ZodSchema>(
  resultSchema: T,
) => {
  return createResponseSchema(
    z.discriminatedUnion('jobSuccess', [
      z.object({
        jobId: z.string(),
        jobSuccess: z.literal(true),
        jobResult: resultSchema,
      }),
      z.object({
        jobId: z.string(),
        jobSuccess: z.literal(false),
        jobResult: z.union([
          z.object({
            submitError: appMessageErrorSchema,
          }),
          z.object({
            jobError: appMessageErrorSchema,
          }),
        ]),
      }),
    ]),
  )
}

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
  GET_APP_USER_ACCESS_TOKEN: createResponseSchema(
    z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
    }),
  ),
  GET_METADATA_SIGNED_URLS: createResponseSchema(z.array(signedUrlSchema)),
  UPDATE_CONTENT_METADATA: createResponseSchema(z.null()),
  GET_APP_STORAGE_SIGNED_URLS: createResponseSchema(z.array(z.string())),
  AUTHENTICATE_USER: createResponseSchema(
    z.object({
      userId: z.string(),
      success: z.boolean(),
    }),
  ),
  EXECUTE_APP_DOCKER_JOB: executeAppDockerJobResponseSchema,
  TRIGGER_APP_TASK: createResponseSchema(z.null()),
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
} as const satisfies Record<z.infer<typeof AppSocketMessage>, ZodTypeAny>

export type AppSocketResponseError = z.infer<typeof appMessageErrorSchema>

export type AppSocketMessageResponseMap = {
  [K in keyof typeof AppSocketMessageResponseSchemaMap]: z.infer<
    (typeof AppSocketMessageResponseSchemaMap)[K]
  >
}

export type AppSocketMessageResultMap = {
  [K in keyof AppSocketMessageResponseMap]: AppSocketMessageResponseMap[K]
}
