import z from 'zod'

import { validateConditionExpression } from './condition-validation.util'
import {
  corePrefixedEventIdentifierSchema,
  eventIdentifierSchema,
} from './events.types'
import { targetLocationContextDTOSchema } from './folder.types'
import { taskIdentifierSchema } from './identifiers.types'
import type { JsonSerializableObject } from './json.types'
import {
  jsonSerializableObjectSchema,
  pgSafeJsonSerializableObjectSchema,
  pgSafeStringSchema,
} from './json.types'
import {
  isValidCronExpression,
  isValidIanaTimezone,
} from './schedule-validation.util'
import { SignedURLsRequestMethod } from './storage.types'

export type TaskData = JsonSerializableObject

export const taskDataSchema: z.ZodType<TaskData> = jsonSerializableObjectSchema

export const taskSystemLogEntryDTOSchema = z.object({
  at: z.iso.datetime(),
  message: z.string(),
  logType: z.enum(['started', 'error', 'requeue', 'success']),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export const taskLogEntryDTOSchema = z.object({
  at: z.iso.datetime(),
  message: z.string(),
  logType: z.string().regex(/^[a-z0-9_]+$/),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export interface SystemLogEntry {
  at: Date
  logType: 'started' | 'error' | 'requeue' | 'success'
  message: string
  payload?: JsonSerializableObject
}

export interface TaskLogEntry {
  at: Date
  logType: string
  message: string
  payload?: JsonSerializableObject
}

export const prefixSchema = z
  .string()
  .refine((value) => !value.startsWith('/'), {
    message: 'Prefix must not start with a slash',
  })

export const storageAccessPolicyAccessRuleSchema = z.union([
  z
    .object({
      folderId: z.string(),
      methods: z.array(z.enum(SignedURLsRequestMethod)),
    })
    .strict(),
  z
    .object({
      folderId: z.string(),
      objectKey: z.string(),
      methods: z.array(z.enum(SignedURLsRequestMethod)),
    })
    .strict(),
  z
    .object({
      folderId: z.string(),
      prefix: prefixSchema,
      methods: z.array(z.enum(SignedURLsRequestMethod)),
    })
    .strict(),
])

export type StorageAccessPolicyAccessRule = z.infer<
  typeof storageAccessPolicyAccessRuleSchema
>
export const storageAccessPolicySchema = z.object({
  rules: storageAccessPolicyAccessRuleSchema.array(),
  outputLocation: z
    .union([
      z
        .object({
          folderId: z.string(),
        })
        .strict(),
      z
        .object({
          folderId: z.string(),
          objectKey: z.string(),
        })
        .strict(),
      z
        .object({
          folderId: z.string(),
          prefix: prefixSchema,
        })
        .strict(),
    ])
    .optional(),
})

export type StorageAccessPolicy = z.infer<typeof storageAccessPolicySchema>

export interface TaskOnCompleteConfig {
  taskIdentifier: z.infer<typeof taskIdentifierSchema>
  condition?: string
  dataTemplate?: JsonSerializableObject
  onComplete?: TaskOnCompleteConfig[] // refined below by inference
}

export const taskOnCompleteConfigSchema: z.ZodType<TaskOnCompleteConfig> = z
  .lazy(() =>
    z.object({
      taskIdentifier: taskIdentifierSchema,
      condition: pgSafeStringSchema
        .min(1)
        .refine(
          (value) => {
            const validation = validateConditionExpression(value)
            return validation.valid
          },
          {
            message: 'Invalid condition expression',
          },
        )
        .optional(), // e.g. "task.success"
      dataTemplate: pgSafeJsonSerializableObjectSchema.optional(), // e.g. { someKey: "{{task.result.someKey}}" }
      onComplete: taskOnCompleteConfigSchema.array().optional(),
    }),
  )
  .meta({ id: 'TaskOnCompleteConfig' })

export const taskOnProgressConfigSchema = z
  .object({
    taskIdentifier: taskIdentifierSchema,
    condition: pgSafeStringSchema
      .min(1)
      .refine(
        (value) => {
          const validation = validateConditionExpression(value)
          return validation.valid
        },
        {
          message: 'Invalid condition expression',
        },
      )
      .optional(), // e.g. "progressReport.code === 'session-started'"
    dataTemplate: pgSafeJsonSerializableObjectSchema.optional(), // e.g. { someKey: "{{progressReport.details.percent}}" }
  })
  .meta({ id: 'TaskOnProgressConfig' })

export type TaskOnProgressConfig = z.infer<typeof taskOnProgressConfigSchema>

const taskTriggerConfigBaseSchema = z.object({
  condition: pgSafeStringSchema
    .min(1)
    .refine(
      (value) => {
        const validation = validateConditionExpression(value)
        return validation.valid
      },
      {
        message: 'Invalid condition expression',
      },
    )
    .optional(),
  taskIdentifier: taskIdentifierSchema,
  onComplete: taskOnCompleteConfigSchema.array().optional(),
  onProgress: taskOnProgressConfigSchema.array().optional(),
})

export const scheduleUnitSchema = z.enum(['minutes', 'hours', 'days'])
export type ScheduleUnit = z.infer<typeof scheduleUnitSchema>

export const scheduleIntervalConfigSchema = z.object({
  kind: z.literal('interval'),
  interval: z.number().int().positive(),
  unit: scheduleUnitSchema,
})
export type ScheduleIntervalConfig = z.infer<
  typeof scheduleIntervalConfigSchema
>

export const scheduleCronConfigSchema = z.object({
  kind: z.literal('cron'),
  // Standard 5-field cron (minute hour dom month dow). Sub-minute granularity
  // is intentionally rejected — the platform's schedule poll cadence is 1m.
  expression: z
    .string()
    .refine(
      isValidCronExpression,
      'invalid cron expression (5-field required)',
    ),
  // IANA timezone (e.g. "America/New_York"). Defaults to UTC at evaluation
  // time when omitted.
  timezone: z
    .string()
    .refine(isValidIanaTimezone, 'invalid IANA timezone')
    .optional(),
})
export type ScheduleCronConfig = z.infer<typeof scheduleCronConfigSchema>

export const scheduleConfigSchema = z
  .discriminatedUnion('kind', [
    scheduleIntervalConfigSchema,
    scheduleCronConfigSchema,
  ])
  .meta({ id: 'ScheduleConfig' })
export type ScheduleConfig = z.infer<typeof scheduleConfigSchema>

export const scheduleTaskTriggerConfigSchema = z
  .object({
    kind: z.literal('schedule'),
    config: scheduleConfigSchema,
    // Stable, app-supplied handle for this trigger. Required on schedules so
    // (a) the task handler can tell which schedule fired (carried into the
    // invocation context), (b) the platform can dedupe per-bucket fires via
    // the idempotency hash, and (c) the app gets durable identity across
    // restarts without having to persist platform-generated UUIDs.
    triggerKey: pgSafeStringSchema,
  })
  .extend(taskTriggerConfigBaseSchema.shape)

export type ScheduleTaskTriggerConfig = z.infer<
  typeof scheduleTaskTriggerConfigSchema
>

export const eventTaskTriggerConfigSchema = z
  .object({
    kind: z.literal('event'),
    eventIdentifier: eventIdentifierSchema.or(
      corePrefixedEventIdentifierSchema,
    ),
    dataTemplate: pgSafeJsonSerializableObjectSchema.optional(), // { "someKey": "{{event.data.someKey}}" }
    // Optional on events — supply one to get the same idempotent-re-register
    // and human-readable discriminator semantics that schedules get for free.
    // When set, must be unique per app across all triggers (config + runtime).
    triggerKey: pgSafeStringSchema.optional(),
  })
  .extend(taskTriggerConfigBaseSchema.shape)

export const userActionTaskTriggerConfigSchema = z
  .object({
    kind: z.literal('user_action'),
    scope: z
      .object({
        user: z
          .object({
            permissions: z.string(),
          })
          .optional(),
        folder: z
          .object({
            folderId: z.guid(),
          })
          .optional(),
      })
      .optional(),
  })
  .extend(taskTriggerConfigBaseSchema.shape)

// --- Executor Metadata ---

export const requeueSchema = z.number().int().min(0)

export const dockerExecutorMetadataSchema = z.object({
  profileKey: z.string(),
  profileHash: z.string(),
  jobIdentifier: z.string(),
  containerId: z.string(),
  hostId: z.string(),
})

export const dockerExecutorStartMetadataSchema = z.object({
  profileKey: z.string(),
  profileHash: z.string(),
  jobIdentifier: z.string(),
})

export const systemExecutorMetadataSchema = jsonSerializableObjectSchema

export const runtimeExecutorMetadataSchema = z.object({
  workerIdentifier: z.string(),
})

export const executorStartMetadataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('system'),
    metadata: systemExecutorMetadataSchema,
  }),
  z.object({
    type: z.literal('docker'),
    metadata: dockerExecutorStartMetadataSchema,
  }),
  z.object({
    type: z.literal('runtime'),
    metadata: runtimeExecutorMetadataSchema,
  }),
])

export const executorMetadataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('system'),
    metadata: systemExecutorMetadataSchema,
  }),
  z.object({
    type: z.literal('docker'),
    metadata: dockerExecutorMetadataSchema,
  }),
  z.object({
    type: z.literal('runtime'),
    metadata: runtimeExecutorMetadataSchema,
  }),
])

export type ExecutorMetadata = z.infer<typeof executorMetadataSchema>
export type ExecutorStartMetadata = z.infer<typeof executorStartMetadataSchema>
export type DockerExecutorMetadata = z.infer<
  typeof dockerExecutorMetadataSchema
>

// --- Task Progress Report Types ---

export const taskProgressDetailsSchema = z.object({
  percent: z.number().min(0).max(100).optional(),
  current: z.number().optional(),
  total: z.number().optional(),
  label: z.string().optional(),
})
export type TaskProgressDetails = z.infer<typeof taskProgressDetailsSchema>

export enum TaskProgressMessageLevel {
  debug = 'debug',
  info = 'info',
  warn = 'warn',
  error = 'error',
}

export const taskProgressMessageLevelSchema = z.enum(TaskProgressMessageLevel)

export enum TaskUpdateAudience {
  system = 'system',
  user = 'user',
}

// Broadcast-side lifecycle event kinds carried on the `/app-user`
// socket. Intentionally keeps the legacy "Update" name to signal that
// it describes the *async update* channel, not worker-originated
// progress reports.
export enum TaskUpdateType {
  task_started = 'task_started',
  task_progress = 'task_progress',
  task_completed = 'task_completed',
  task_requeued = 'task_requeued',
  task_failed = 'task_failed',
}

export const taskProgressMessageSchema = z.object({
  level: taskProgressMessageLevelSchema,
  text: z.string(),
  audience: z.enum(['user', 'system']),
})
export type TaskProgressMessage = z.infer<typeof taskProgressMessageSchema>

export const taskProgressReportSchema = z.object({
  code: z.string().optional(),
  details: taskProgressDetailsSchema.optional(),
  message: taskProgressMessageSchema.optional(),
  timestamp: z.string().optional(),
  executorMetadata: executorMetadataSchema.optional(),
})
export type TaskProgressReport = z.infer<typeof taskProgressReportSchema>

export const receivedTaskProgressReportSchema = taskProgressReportSchema.extend(
  {
    receivedAt: z.iso.datetime(),
  },
)
export type ReceivedTaskProgressReport = z.infer<
  typeof receivedTaskProgressReportSchema
>

// --- Task Invocation ---

// The invoked task's invocation context
export const taskInvocationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('system_action'),
    invokeContext: z.object({
      idempotencyData: jsonSerializableObjectSchema.optional(),
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
    onProgress: z.array(taskOnProgressConfigSchema).optional(),
  }),
  z.object({
    kind: z.literal('event'),
    invokeContext: z.object({
      eventId: z.guid(),
      emitterId: z.string(),
      eventIdentifier: eventIdentifierSchema.or(
        corePrefixedEventIdentifierSchema,
      ),
      // Config-sourced triggers carry their array index; runtime-sourced
      // triggers omit this and set runtimeTriggerId instead.
      eventTriggerConfigIndex: z.number().int().optional(),
      runtimeTriggerId: z.guid().optional(),
      // Mirrors the trigger's optional `triggerKey` — handlers can use it as
      // a stable human-readable discriminator instead of the runtime UUID.
      triggerKey: z.string().optional(),
      dataTemplate: jsonSerializableObjectSchema.optional(),
      targetUserId: z.guid().optional(),
      targetLocation: targetLocationContextDTOSchema.optional(),
      eventData: jsonSerializableObjectSchema,
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
    onProgress: z.array(taskOnProgressConfigSchema).optional(),
  }),
  z.object({
    kind: z.literal('schedule'),
    invokeContext: z.object({
      timestampBucket: z.string(),
      triggerKey: z.string(),
      config: scheduleConfigSchema,
      runtimeTriggerId: z.guid().optional(),
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
    onProgress: z.array(taskOnProgressConfigSchema).optional(),
  }),
  z.object({
    kind: z.literal('user_action'),
    invokeContext: z.object({
      userId: z.guid(),
      requestId: z.guid(),
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
    onProgress: z.array(taskOnProgressConfigSchema).optional(),
  }),
  z.object({
    kind: z.literal('app_action'),
    invokeContext: z.object({
      requestId: z.guid(),
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
    onProgress: z.array(taskOnProgressConfigSchema).optional(),
  }),
  z.object({
    kind: z.literal('task_complete_child'),
    invokeContext: z.object({
      parentTask: z.object({
        id: z.uuid(),
        identifier: z.string(),
        success: z.boolean(),
        result: jsonSerializableObjectSchema,
      }),
      onCompleteHandlerIndex: z.number().int(),
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
    onProgress: taskOnProgressConfigSchema.array().optional(),
  }),
  z.object({
    kind: z.literal('task_progress_child'),
    invokeContext: z.object({
      parentTask: z.object({
        id: z.uuid(),
        identifier: z.string(),
        progressReport: taskProgressReportSchema,
      }),
      onProgressHandlerIndex: z.number().int(),
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
    onProgress: taskOnProgressConfigSchema.array().optional(),
  }),
])

export const taskTriggerConfigSchema = z.discriminatedUnion('kind', [
  eventTaskTriggerConfigSchema,
  scheduleTaskTriggerConfigSchema,
  userActionTaskTriggerConfigSchema,
])

// Subset of taskTriggerConfigSchema that an app may add/remove at runtime via
// the worker socket. user_action triggers are config-only.
export const registerableTriggerConfigSchema = z.discriminatedUnion('kind', [
  eventTaskTriggerConfigSchema,
  scheduleTaskTriggerConfigSchema,
])

export type RegisterableTriggerConfig = z.infer<
  typeof registerableTriggerConfigSchema
>

export type TaskInvocation = z.infer<typeof taskInvocationSchema>

export const taskConfigSchema = z
  .object({
    identifier: taskIdentifierSchema,
    label: z.string().nonempty().min(1).max(128),
    description: z.string(),
    handler: z.object({
      type: z.enum(['runtime', 'docker']),
      identifier: z.string().nonempty(),
    }),
  })
  .strict()

export const taskDTOSchema = z.object({
  id: z.guid(),
  taskIdentifier: z.string(),
  ownerId: z.string(),
  invocation: taskInvocationSchema,
  success: z.boolean().optional(),
  handlerIdentifier: z.string().optional(),
  data: taskDataSchema.optional(),
  targetLocation: targetLocationContextDTOSchema.optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: jsonSerializableObjectSchema.optional(),
    })
    .optional(),
  taskDescription: z.string(),
  systemLog: z.array(taskSystemLogEntryDTOSchema),
  taskLog: z.array(taskLogEntryDTOSchema),
  progress: taskProgressDetailsSchema.optional(),
  progressReports: z.array(receivedTaskProgressReportSchema).optional(),
  result: jsonSerializableObjectSchema.optional(),
  startedAt: z.iso.datetime().optional(),
  completedAt: z.iso.datetime().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

// --- Task Response Types ---

export const taskErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    name: z.string().optional(),
    code: z.string(),
    message: z.string(),
    stack: z.string().optional(),
    cause: z
      .object({
        code: z.string(),
        name: z.string(),
        message: z.string(),
        stack: z.string().optional(),
        details: jsonSerializableObjectSchema.optional(),
      })
      .optional(),
    details: jsonSerializableObjectSchema.optional(),
  }),
  requeueDelayMs: requeueSchema.optional(),
  // On the error path the executor may have failed before it reached
  // a runtime-only state (e.g. docker container never came up), so we
  // accept either the full ExecutorMetadata or the ExecutorStart form.
  executorMetadata: z.union([
    executorStartMetadataSchema,
    executorMetadataSchema,
  ]),
})

export const taskSuccessResponseSchema = z.object({
  success: z.literal(true),
  result: jsonSerializableObjectSchema.optional(),
  executorMetadata: executorMetadataSchema,
})

// System log payload schemas — typed shapes for entries written by
// registerTaskStarted/Completed/Heartbeat. The 'started' payload uses
// ExecutorStartMetadata at registration time and is upgraded to the
// full ExecutorMetadata on first heartbeat once the executor reports
// runtime-only fields (e.g. containerId/hostId).
export const taskStartedSystemLogPayloadSchema = z.object({
  executorMetadata: z.union([
    executorStartMetadataSchema,
    executorMetadataSchema,
  ]),
})
export type TaskStartedSystemLogPayload = z.infer<
  typeof taskStartedSystemLogPayloadSchema
>

export const taskSuccessSystemLogPayloadSchema = z.object({
  result: jsonSerializableObjectSchema.optional(),
  executorMetadata: executorMetadataSchema,
})
export type TaskSuccessSystemLogPayload = z.infer<
  typeof taskSuccessSystemLogPayloadSchema
>

export const taskErrorSystemLogPayloadSchema = z.object({
  error: z.object({
    code: z.string(),
    name: z.string().optional(),
    message: z.string(),
    details: jsonSerializableObjectSchema.optional(),
  }),
  executorMetadata: z.union([
    executorStartMetadataSchema,
    executorMetadataSchema,
  ]),
})
export type TaskErrorSystemLogPayload = z.infer<
  typeof taskErrorSystemLogPayloadSchema
>

export const taskCompletionSchema = z.discriminatedUnion('success', [
  taskErrorResponseSchema,
  taskSuccessResponseSchema,
])

export type TaskCompletion = z.infer<typeof taskCompletionSchema>

export type TaskDTO = z.infer<typeof taskDTOSchema>
