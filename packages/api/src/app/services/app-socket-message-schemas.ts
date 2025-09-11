import type { AppSocketMessage } from '@lombokapp/types'
import {
  metadataEntrySchema,
  SignedURLsRequestMethod,
  workerErrorDetailsSchema,
} from '@lombokapp/types'
import { LogEntryLevel } from 'src/log/entities/log-entry.entity'
import type { ZodTypeAny } from 'zod'
import { z } from 'zod'

export const logEntrySchema = z.object({
  message: z.string(),
  level: z.nativeEnum(LogEntryLevel),
  subjectContext: z
    .object({
      folderId: z.string(),
      objectKey: z.string().optional(),
    })
    .optional(),
  data: z.unknown().optional(),
})

export const attemptStartHandleTaskSchema = z.object({
  taskIdentifiers: z.array(z.string()),
})

export const attemptStartHandleTaskByIdSchema = z.object({
  taskId: z.string().uuid(),
  taskHandlerId: z.string().nonempty().max(512).optional(),
})

export const getWorkerExecutionDetailsSchema = z.object({
  appIdentifier: z.string(),
  workerIdentifier: z.string(),
})

export const getAppUIbundleSchema = z.object({
  appIdentifier: z.string(),
})

export const getAppUserAccessTokenSchema = z.object({
  userId: z.string().uuid(),
})

export const getContentSignedUrlsSchema = z.object({
  requests: z.array(
    z.object({
      folderId: z.string(),
      objectKey: z.string(),
      method: z.nativeEnum(SignedURLsRequestMethod),
    }),
  ),
})

export const getMetadataSignedUrlsSchema = z.object({
  requests: z.array(
    z.object({
      folderId: z.string(),
      objectKey: z.string(),
      contentHash: z.string(),
      method: z.nativeEnum(SignedURLsRequestMethod),
      metadataHash: z.string(),
    }),
  ),
})

export const updateMetadataSchema = z.object({
  updates: z.array(
    z.object({
      folderId: z.string(),
      objectKey: z.string(),
      hash: z.string(),
      metadata: z.record(z.string(), metadataEntrySchema),
    }),
  ),
})

export const failHandleTaskSchema = z.object({
  taskId: z.string().uuid(),
  error: z.object({
    message: z.string(),
    code: z.string(),
    details: workerErrorDetailsSchema.optional(),
  }),
})

export const completeHandleTaskSchema = z.object({
  taskId: z.string().uuid(),
})

export const getAppStorageSignedUrlsSchema = z.object({
  requests: z.array(
    z.object({
      objectKey: z.string().min(1),
      method: z.nativeEnum(SignedURLsRequestMethod),
    }),
  ),
})

export const dbQuerySchema = z.object({
  sql: z.string(),
  params: z.array(z.unknown()),
  rowMode: z.string().optional(),
})

export const emitEventSchema = z.object({
  eventIdentifier: z.string(),
  data: z.unknown(),
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

export const AppSocketMessageSchemaMap = {
  EMIT_EVENT: emitEventSchema,
  DB_QUERY: dbQuerySchema,
  DB_EXEC: dbExecSchema,
  DB_BATCH: dbBatchSchema,
  SAVE_LOG_ENTRY: logEntrySchema,
  GET_CONTENT_SIGNED_URLS: getContentSignedUrlsSchema,
  GET_APP_USER_ACCESS_TOKEN: getAppUserAccessTokenSchema,
  GET_METADATA_SIGNED_URLS: getMetadataSignedUrlsSchema,
  UPDATE_CONTENT_METADATA: updateMetadataSchema,
  COMPLETE_HANDLE_TASK: completeHandleTaskSchema,
  ATTEMPT_START_HANDLE_ANY_AVAILABLE_TASK: attemptStartHandleTaskSchema,
  FAIL_HANDLE_TASK: failHandleTaskSchema,
  ATTEMPT_START_HANDLE_WORKER_TASK_BY_ID: attemptStartHandleTaskByIdSchema,
  GET_APP_UI_BUNDLE: getAppUIbundleSchema,
  GET_WORKER_EXECUTION_DETAILS: getWorkerExecutionDetailsSchema,
  GET_APP_STORAGE_SIGNED_URLS: getAppStorageSignedUrlsSchema,
  AUTHENTICATE_USER: authenticateUserSchema,
} as const satisfies Record<z.infer<typeof AppSocketMessage>, ZodTypeAny>

export type AppSocketMessageDataMap = {
  [K in keyof typeof AppSocketMessageSchemaMap]: z.infer<
    (typeof AppSocketMessageSchemaMap)[K]
  >
}
