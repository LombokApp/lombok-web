import z from 'zod'

import { validateConditionExpression } from './condition-validation.util'
import { platformPrefixedEventIdentifierSchema } from './events.types'
import { targetLocationContextDTOSchema } from './folder.types'
import {
  genericIdentifierSchema,
  taskIdentifierSchema,
} from './identifiers.types'
import type { JsonSerializableObject } from './json.types'
import { jsonSerializableObjectDTOSchema } from './json.types'
import { SignedURLsRequestMethod } from './storage.types'

export type TaskData = JsonSerializableObject

export const taskDataSchema: z.ZodType<TaskData> =
  jsonSerializableObjectDTOSchema

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
      dataTemplate: jsonSerializableObjectDTOSchema.optional(), // e.g. { someKey: "{{task.result.someKey}}" }
      onComplete: taskOnCompleteConfigSchema.array().optional(),
    }),
  )

export const userActionTriggerDataSchema = z.object({
  userId: z.string().uuid(),
})

export const taskEventInvocationContextSchema = z.object({
  eventId: z.string().uuid(),
  emitterIdentifier: z.string(),
  targetUserId: z.string().uuid().optional(),
  targetLocation: targetLocationContextDTOSchema.optional(),
  eventData: jsonSerializableObjectDTOSchema,
})

export const userActionEventInvocationContextSchema = z.object({
  userId: z.string().uuid(),
})

const taskOnCompleteConfigBaseSchema = z.object({
  onComplete: taskOnCompleteConfigSchema.array().optional(),
})

const taskTriggerConfigBaseSchema = z
  .object({
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
  })
  .merge(taskOnCompleteConfigBaseSchema)

export const childTaskTriggerInvocationSchema = z
  .object({
    kind: z.literal('task_child'),
    invokeContext: z.object({
      parentTask: z.object({
        id: z.string().uuid(),
        identifier: z.string(),
        success: z.boolean(),
      }),
    }),
  })
  .merge(taskOnCompleteConfigBaseSchema)

export const appActionTaskTriggerInvocationSchema = z
  .object({
    kind: z.literal('app_action'),
  })
  .merge(taskOnCompleteConfigBaseSchema)

export const taskScheduleTriggerConfigSchema = z
  .object({
    kind: z.literal('schedule'),
    config: z.object({
      interval: z.number().int().positive(),
      unit: z.enum(['minutes', 'hours', 'days']),
    }),
  })
  .merge(taskTriggerConfigBaseSchema)

export type TaskScheduleTriggerConfig = z.infer<
  typeof taskScheduleTriggerConfigSchema
>

export const taskEventTriggerConfigSchema = z
  .object({
    kind: z.literal('event'),
    eventIdentifier: genericIdentifierSchema.or(
      platformPrefixedEventIdentifierSchema,
    ),
    dataTemplate: jsonSerializableObjectDTOSchema.optional(), // { "someKey": "{{event.data.someKey}}" }
  })
  .merge(taskTriggerConfigBaseSchema)

export const taskUserActionTriggerConfigSchema = z
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

// The invoked task's trigger config and invocation context
export const taskInvocationSchema = z.discriminatedUnion('kind', [
  taskEventTriggerConfigSchema
    .omit({ taskIdentifier: true })
    .merge(z.object({ invokeContext: taskEventInvocationContextSchema })),
  taskScheduleTriggerConfigSchema
    .omit({ taskIdentifier: true })
    .merge(z.object({ invokeContext: jsonSerializableObjectDTOSchema })),
  taskUserActionTriggerConfigSchema
    .omit({ taskIdentifier: true })
    .merge(z.object({ invokeContext: userActionEventInvocationContextSchema })),
  appActionTaskTriggerInvocationSchema,
  childTaskTriggerInvocationSchema,
])

export const taskTriggerConfigSchema = z.discriminatedUnion('kind', [
  taskEventTriggerConfigSchema,
  taskScheduleTriggerConfigSchema,
  taskUserActionTriggerConfigSchema,
])

export type TaskInvocation = z.infer<typeof taskInvocationSchema>

export const taskConfigSchema = z
  .object({
    identifier: taskIdentifierSchema,
    label: z.string().nonempty().min(1).max(128),
    description: z.string(),
    handler: z.discriminatedUnion('type', [
      z.object({
        type: z.literal('worker'),
        identifier: z.string().nonempty(),
      }),
      z.object({
        type: z.literal('docker'),
        identifier: z.string().nonempty(),
      }),
      z.object({
        type: z.literal('external'),
      }),
    ]),
  })
  .strict()

export const taskDTOSchema = z.object({
  id: z.string().uuid(),
  taskIdentifier: z.string(),
  ownerIdentifier: z.string(),
  trigger: taskInvocationSchema,
  success: z.boolean().optional(),
  handlerIdentifier: z.string().optional(),
  data: taskDataSchema.optional(),
  targetLocation: targetLocationContextDTOSchema.optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: jsonSerializableObjectDTOSchema.optional(),
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

export type RequeueConfig =
  | { shouldRequeue: true; delayMs: number; notBefore: Date | undefined }
  | { shouldRequeue: false }
