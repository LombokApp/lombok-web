import z from 'zod'

import { platformPrefixedEventIdentifierSchema } from './events.types'
import { targetLocationContextDTOSchema } from './folder.types'
import { genericIdentifierSchema } from './identifiers.types'
import type { JsonSerializableObject } from './json.types'
import { jsonSerializableObjectDTOSchema } from './json.types'
import { SignedURLsRequestMethod } from './storage.types'

export const taskIdentifierSchema = genericIdentifierSchema

export const taskUserActionTriggerConfigSchema = z.object({
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

export const taskEventTriggerConfigSchema = z.object({
  kind: z.literal('event'),
  identifier: genericIdentifierSchema.or(platformPrefixedEventIdentifierSchema),
  data: jsonSerializableObjectDTOSchema.optional(), // { "someKey": "{{event.data.someKey}}" }
})

export type TaskEventTriggerConfig = z.infer<
  typeof taskEventTriggerConfigSchema
>

export const taskScheduleTriggerConfigSchema = z.object({
  kind: z.literal('schedule'),
  config: z.object({
    interval: z.number().int().positive(),
    unit: z.enum(['minutes', 'hours', 'days']),
  }),
})

export type TaskScheduleTriggerConfig = z.infer<
  typeof taskScheduleTriggerConfigSchema
>

export type TaskData = JsonSerializableObject

export const taskDataSchema: z.ZodType<TaskData> =
  jsonSerializableObjectDTOSchema

export const taskSystemLogEntryDTOSchema = z.object({
  at: z.string().datetime(),
  payload: z.object({
    logType: z.enum(['started', 'failure', 'requeue', 'success']),
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
    logType: 'started' | 'failure' | 'requeue' | 'success'
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
  data: z
    .object({
      success: jsonSerializableObjectDTOSchema.optional(), // { "someKey": "{{task.result.someKey}}" }
      failure: jsonSerializableObjectDTOSchema.optional(), // { "someOtherKey": "{{task.error.someOtherKey}}" }
    })
    .optional(),
  // keepTargetLocation: z.boolean().optional(), // default true
})

export const taskOnCompleteConfigBaseSchema = z.object({
  onComplete: z
    .union([taskOnCompleteConfigSchema, taskOnCompleteConfigSchema.array()])
    .optional(),
})

export const eventTriggerDataSchema = z.object({
  eventId: z.string().uuid(),
  eventIdentifier: z.string(),
  emitterIdentifier: z.string(),
  targetUserId: z.string().uuid().optional(),
  targetLocation: targetLocationContextDTOSchema.optional(),
  eventData: jsonSerializableObjectDTOSchema,
})

export const scheduleTriggerDataSchema = z.object({
  interval: z.number().int().positive(),
  unit: z.enum(['minutes', 'hours', 'days']),
})

export const userActionTriggerDataSchema = z.object({
  userId: z.string().uuid(),
})

export const taskChildTriggerDataSchema = z.object({
  parentTaskId: z.string().uuid(),
  parentTaskIdentifier: z.string(),
})

export const taskInvocationSchema = taskOnCompleteConfigBaseSchema.and(
  z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('event'),
      data: eventTriggerDataSchema,
    }),
    z.object({
      kind: z.literal('schedule'),
      data: scheduleTriggerDataSchema,
    }),
    z.object({
      kind: z.literal('user_action'),
      data: userActionTriggerDataSchema,
    }),
    z.object({
      kind: z.literal('app_action'),
    }),
    z.object({
      kind: z.literal('task_child'),
      data: taskChildTriggerDataSchema,
    }),
  ]),
)
export const taskTriggerConfigSchema = taskOnCompleteConfigBaseSchema.and(
  z.discriminatedUnion('kind', [
    taskEventTriggerConfigSchema,
    taskScheduleTriggerConfigSchema,
    taskUserActionTriggerConfigSchema,
  ]),
)

export type TaskTriggerConfig = z.infer<typeof taskTriggerConfigSchema>

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

export type TaskTrigger = z.infer<typeof taskInvocationSchema>

export interface EventTaskTrigger {
  kind: 'event'
  data: z.infer<typeof eventTriggerDataSchema>
}

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
