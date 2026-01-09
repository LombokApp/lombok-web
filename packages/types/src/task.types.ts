import z from 'zod'

import { validateConditionExpression } from './condition-validation.util'
import {
  corePrefixedEventIdentifierSchema,
  eventIdentifierSchema,
} from './events.types'
import { targetLocationContextDTOSchema } from './folder.types'
import { taskIdentifierSchema } from './identifiers.types'
import type { JsonSerializableObject } from './json.types'
import { jsonSerializableObjectSchema } from './json.types'
import { SignedURLsRequestMethod } from './storage.types'

export type TaskData = JsonSerializableObject

export const taskDataSchema: z.ZodType<TaskData> = jsonSerializableObjectSchema

export const taskSystemLogEntryDTOSchema = z.object({
  at: z.string().datetime(),
  message: z.string(),
  logType: z.enum(['started', 'error', 'requeue', 'success']),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export const taskLogEntryDTOSchema = z.object({
  at: z.string().datetime(),
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

export const storageAccessPolicyEntrySchema = z.object({
  folderId: z.string(),
  prefix: z
    .string()
    .refine((value) => !value.startsWith('/'), {
      message: 'Prefix must not start with a slash',
    })
    .optional(),
  methods: z.array(z.nativeEnum(SignedURLsRequestMethod)),
})

export type StorageAccessPolicyEntry = z.infer<
  typeof storageAccessPolicyEntrySchema
>
export const storageAccessPolicySchema = storageAccessPolicyEntrySchema.array()

export type StorageAccessPolicy = z.infer<typeof storageAccessPolicySchema>

export interface TaskOnCompleteConfig {
  taskIdentifier: z.infer<typeof taskIdentifierSchema>
  condition?: string
  dataTemplate?: JsonSerializableObject
  onComplete?: TaskOnCompleteConfig[] // refined below by inference
}

export const taskOnCompleteConfigSchema: z.ZodType<TaskOnCompleteConfig> =
  z.lazy(() =>
    z.object({
      taskIdentifier: taskIdentifierSchema,
      condition: z
        .string()
        .nonempty()
        .refine(
          (value) => {
            const validation = validateConditionExpression(value)
            return validation.valid
          },
          (value) => {
            const validation = validateConditionExpression(value)
            return {
              message: validation.error ?? 'Invalid condition expression',
            }
          },
        )
        .optional(), // e.g. "task.success"
      dataTemplate: jsonSerializableObjectSchema.optional(), // e.g. { someKey: "{{task.result.someKey}}" }
      onComplete: taskOnCompleteConfigSchema.array().optional(),
    }),
  )

const taskTriggerConfigBaseSchema = z.object({
  condition: z
    .string()
    .nonempty()
    .refine(
      (value) => {
        const validation = validateConditionExpression(value)
        return validation.valid
      },
      (value) => {
        const validation = validateConditionExpression(value)
        return {
          message: validation.error ?? 'Invalid condition expression',
        }
      },
    )
    .optional(),
  taskIdentifier: taskIdentifierSchema,
  onComplete: taskOnCompleteConfigSchema.array().optional(),
})

export const scheduleUnitSchema = z.enum(['minutes', 'hours', 'days'])
export type ScheduleUnit = z.infer<typeof scheduleUnitSchema>
export const scheduleConfigSchema = z.object({
  interval: z.number().int().positive(),
  unit: scheduleUnitSchema,
})
export type ScheduleConfig = z.infer<typeof scheduleConfigSchema>

export const scheduleTaskTriggerConfigSchema = z
  .object({
    kind: z.literal('schedule'),
    config: scheduleConfigSchema,
    name: z.string(),
  })
  .merge(taskTriggerConfigBaseSchema)

export type ScheduleTaskTriggerConfig = z.infer<
  typeof scheduleTaskTriggerConfigSchema
>

export const eventTaskTriggerConfigSchema = z
  .object({
    kind: z.literal('event'),
    eventIdentifier: eventIdentifierSchema.or(
      corePrefixedEventIdentifierSchema,
    ),
    dataTemplate: jsonSerializableObjectSchema.optional(), // { "someKey": "{{event.data.someKey}}" }
  })
  .merge(taskTriggerConfigBaseSchema)

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
            folderId: z.string().uuid(),
          })
          .optional(),
      })
      .optional(),
  })
  .merge(taskTriggerConfigBaseSchema)

// The invoked task's invocation context
export const taskInvocationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('event'),
    invokeContext: z.object({
      eventId: z.string().uuid(),
      emitterIdentifier: z.string(),
      eventIdentifier: eventIdentifierSchema.or(
        corePrefixedEventIdentifierSchema,
      ),
      eventTriggerConfigIndex: z.number().int(),
      dataTemplate: jsonSerializableObjectSchema.optional(),
      targetUserId: z.string().uuid().optional(),
      targetLocation: targetLocationContextDTOSchema.optional(),
      eventData: jsonSerializableObjectSchema,
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
  }),
  z.object({
    kind: z.literal('schedule'),
    invokeContext: z.object({
      timestampBucket: z.string(),
      name: z.string(),
      config: z.object({
        interval: z.number().int().positive(),
        unit: z.enum(['minutes', 'hours', 'days']),
      }),
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
  }),
  z.object({
    kind: z.literal('user_action'),
    invokeContext: z.object({
      userId: z.string().uuid(),
      requestId: z.string().uuid(),
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
  }),
  z.object({
    kind: z.literal('app_action'),
    invokeContext: z.object({
      requestId: z.string().uuid(),
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
  }),
  z.object({
    kind: z.literal('task_child'),
    invokeContext: z.object({
      parentTask: z.object({
        id: z.string().uuid(),
        identifier: z.string(),
        success: z.boolean(),
      }),
      onCompleteHandlerIndex: z.number().int(),
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
  }),
])

export const taskTriggerConfigSchema = z.discriminatedUnion('kind', [
  eventTaskTriggerConfigSchema,
  scheduleTaskTriggerConfigSchema,
  userActionTaskTriggerConfigSchema,
])

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
  id: z.string().uuid(),
  taskIdentifier: z.string(),
  ownerIdentifier: z.string(),
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
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const requeueSchema = z.number().int().min(0)

export const jobErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    name: z.string().optional(),
    code: z.string(),
    message: z.string(),
    details: jsonSerializableObjectSchema.optional(),
  }),
  requeueDelayMs: requeueSchema.optional(),
})

export const jobSuccessResponseSchema = z.object({
  success: z.literal(true),
  result: jsonSerializableObjectSchema.optional(),
})

export const taskCompletionSchema = z.discriminatedUnion('success', [
  jobErrorResponseSchema,
  jobSuccessResponseSchema,
])

export type TaskCompletion = z.infer<typeof taskCompletionSchema>
