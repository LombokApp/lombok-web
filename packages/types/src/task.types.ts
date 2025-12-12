import z from 'zod'

import { platformPrefixedEventIdentifierSchema } from './events.types'
import { targetLocationContextDTOSchema } from './folder.types'
import { genericIdentifierSchema } from './identifiers.types'
import type { JsonSerializableObject } from './json.types'
import { jsonSerializableObjectDTOSchema } from './json.types'
import { SignedURLsRequestMethod } from './storage.types'

export const taskIdentifierSchema = genericIdentifierSchema

export type TaskData = JsonSerializableObject

export const taskDataSchema: z.ZodType<TaskData> =
  jsonSerializableObjectDTOSchema

export const taskSystemLogEntryDTOSchema = z.object({
  at: z.string().datetime(),
  payload: z.object({
    logType: z.enum(['started', 'error', 'requeue', 'success']),
    data: z.record(z.string(), z.unknown()).optional(),
  }),
})

export const taskLogEntryDTOSchema = z.object({
  at: z.string().datetime(),
  message: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export interface SystemLogEntry {
  at: Date
  payload: {
    logType: 'started' | 'error' | 'requeue' | 'success'
    data?: JsonSerializableObject
  }
}

export interface TaskLogEntry {
  at: Date
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

export const taskOnCompleteConfigSchema = z.object({
  taskIdentifier: taskIdentifierSchema,
  dataTemplate: z
    .object({
      success: jsonSerializableObjectDTOSchema.optional(), // { "someKey": "{{task.result.someKey}}" }
      failure: jsonSerializableObjectDTOSchema.optional(), // { "someOtherKey": "{{task.error.someOtherKey}}" }
    })
    .optional(),
})

export const taskOnCompleteConfigBaseSchema = z.object({
  onComplete: z
    .union([taskOnCompleteConfigSchema, taskOnCompleteConfigSchema.array()])
    .optional(),
})

export const userActionTriggerDataSchema = z.object({
  userId: z.string().uuid(),
})

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
  .merge(taskOnCompleteConfigBaseSchema)

export const taskEventTriggerConfigSchema = z
  .object({
    kind: z.literal('event'),
    eventIdentifier: genericIdentifierSchema.or(
      platformPrefixedEventIdentifierSchema,
    ),
    dataTemplate: jsonSerializableObjectDTOSchema.optional(), // { "someKey": "{{event.data.someKey}}" }
  })
  .merge(taskOnCompleteConfigBaseSchema)

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

export const taskScheduleTriggerConfigSchema = z
  .object({
    kind: z.literal('schedule'),
    config: z.object({
      interval: z.number().int().positive(),
      unit: z.enum(['minutes', 'hours', 'days']),
    }),
  })
  .merge(taskOnCompleteConfigBaseSchema)

export const taskTriggerConfigSchema = z.discriminatedUnion('kind', [
  taskEventTriggerConfigSchema,
  taskScheduleTriggerConfigSchema,
  taskUserActionTriggerConfigSchema,
])

export const taskAppActionTriggerInvocationSchema = z
  .object({
    kind: z.literal('app_action'),
  })
  .merge(taskOnCompleteConfigBaseSchema)

export const taskTaskChildTriggerInvocationSchema = z
  .object({
    kind: z.literal('task_child'),
    invokeContext: z.object({
      parentTaskId: z.string().uuid(),
      parentTaskSuccess: z.boolean(),
      parentTaskIdentifier: z.string(),
    }),
  })
  .merge(taskOnCompleteConfigBaseSchema)

// The invoked task's trigger config and invocation context
export const taskInvocationSchema = z.discriminatedUnion('kind', [
  taskEventTriggerConfigSchema.merge(
    z.object({ invokeContext: taskEventInvocationContextSchema }),
  ),
  taskScheduleTriggerConfigSchema.merge(
    z.object({ invokeContext: jsonSerializableObjectDTOSchema }),
  ),
  taskUserActionTriggerConfigSchema.merge(
    z.object({ invokeContext: userActionEventInvocationContextSchema }),
  ),
  taskAppActionTriggerInvocationSchema,
  taskTaskChildTriggerInvocationSchema,
])

export type TaskTriggerConfig = z.infer<typeof taskTriggerConfigSchema>

export type TaskScheduleTriggerConfig = z.infer<
  typeof taskScheduleTriggerConfigSchema
>
export type TaskEventTriggerConfig = z.infer<
  typeof taskEventTriggerConfigSchema
>
export type TaskUserActionTriggerConfig = z.infer<
  typeof taskUserActionTriggerConfigSchema
>

export type TaskInvocation = z.infer<typeof taskInvocationSchema>

export type TaskOnCompleteConfig = z.infer<typeof taskOnCompleteConfigSchema>

export const taskConfigSchema = z
  .object({
    identifier: taskIdentifierSchema,
    label: z.string().nonempty().min(1).max(128),
    triggers: taskTriggerConfigSchema.array().optional(),
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
  data: taskDataSchema,
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
