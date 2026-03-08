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

// --- Task Update Types ---

export const taskProgressSchema = z.object({
  percent: z.number().min(0).max(100).optional(),
  current: z.number().optional(),
  total: z.number().optional(),
  label: z.string().optional(),
})
export type TaskProgress = z.infer<typeof taskProgressSchema>

export const taskUpdateMessageSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']),
  text: z.string(),
  audience: z.enum(['user', 'system']),
})
export type TaskUpdateMessage = z.infer<typeof taskUpdateMessageSchema>

export const taskUpdateSchema = z.object({
  code: z.string().optional(),
  progress: taskProgressSchema.optional(),
  message: taskUpdateMessageSchema.optional(),
  data: jsonSerializableObjectSchema.optional(),
  timestamp: z.string().optional(),
})
export type TaskUpdate = z.infer<typeof taskUpdateSchema>

export const receivedTaskUpdateSchema = taskUpdateSchema.extend({
  receivedAt: z.iso.datetime(),
})
export type ReceivedTaskUpdate = z.infer<typeof receivedTaskUpdateSchema>

export const taskOnUpdateHandlerConfigSchema = z.object({
  condition: z.string().optional(),
  taskIdentifier: z.string(),
  taskDataTemplate: jsonSerializableObjectSchema.optional(),
})
export type TaskOnUpdateHandlerConfig = z.infer<
  typeof taskOnUpdateHandlerConfigSchema
>

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

export const taskOnCompleteConfigSchema: z.ZodType<TaskOnCompleteConfig> =
  z.lazy(() =>
    z.object({
      taskIdentifier: taskIdentifierSchema,
      condition: z
        .string()
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
      dataTemplate: jsonSerializableObjectSchema.optional(), // e.g. { someKey: "{{task.result.someKey}}" }
      onComplete: taskOnCompleteConfigSchema.array().optional(),
    }),
  )

const taskTriggerConfigBaseSchema = z.object({
  condition: z
    .string()
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
  onUpdate: z.array(taskOnUpdateHandlerConfigSchema).optional(),
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
    dataTemplate: jsonSerializableObjectSchema.optional(), // { "someKey": "{{event.data.someKey}}" }
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

// The invoked task's invocation context
export const taskInvocationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('system_action'),
    invokeContext: z.object({
      idempotencyData: jsonSerializableObjectSchema.optional(),
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
    onUpdate: z.array(taskOnUpdateHandlerConfigSchema).optional(),
  }),
  z.object({
    kind: z.literal('event'),
    invokeContext: z.object({
      eventId: z.guid(),
      emitterIdentifier: z.string(),
      eventIdentifier: eventIdentifierSchema.or(
        corePrefixedEventIdentifierSchema,
      ),
      eventTriggerConfigIndex: z.number().int(),
      dataTemplate: jsonSerializableObjectSchema.optional(),
      targetUserId: z.guid().optional(),
      targetLocation: targetLocationContextDTOSchema.optional(),
      eventData: jsonSerializableObjectSchema,
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
    onUpdate: z.array(taskOnUpdateHandlerConfigSchema).optional(),
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
    onUpdate: z.array(taskOnUpdateHandlerConfigSchema).optional(),
  }),
  z.object({
    kind: z.literal('user_action'),
    invokeContext: z.object({
      userId: z.guid(),
      requestId: z.guid(),
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
    onUpdate: z.array(taskOnUpdateHandlerConfigSchema).optional(),
  }),
  z.object({
    kind: z.literal('app_action'),
    invokeContext: z.object({
      requestId: z.guid(),
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
    onUpdate: z.array(taskOnUpdateHandlerConfigSchema).optional(),
  }),
  z.object({
    kind: z.literal('task_child'),
    invokeContext: z.object({
      parentTask: z.object({
        id: z.guid(),
        identifier: z.string(),
        success: z.boolean(),
      }),
      onCompleteHandlerIndex: z.number().int(),
    }),
    onComplete: taskOnCompleteConfigSchema.array().optional(),
    onUpdate: z.array(taskOnUpdateHandlerConfigSchema).optional(),
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
  id: z.guid(),
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
  startedAt: z.iso.datetime().optional(),
  completedAt: z.iso.datetime().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export const requeueSchema = z.number().int().min(0)

export const dockerExecutorMetadataSchema = z.object({
  profileKey: z.string(),
  profileHash: z.string(),
  jobIdentifier: z.string(),
  containerId: z.string(),
  hostId: z.string(),
  extra: jsonSerializableObjectSchema,
})

export const dockerExecutorStartMetadataSchema = z.object({
  profileKey: z.string(),
  profileHash: z.string(),
  jobIdentifier: z.string(),
})

export const systemExecutorMetadataSchema = z.object({
  lombokInstanceId: z.string().optional(),
  extra: jsonSerializableObjectSchema,
})

export const runtimeExecutorMetadataSchema = z.object({
  workerIdentifier: z.string(),
  extra: jsonSerializableObjectSchema,
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

export const partialExecutorMetadataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('system'),
    metadata: systemExecutorMetadataSchema.partial(),
  }),
  z.object({
    type: z.literal('docker'),
    metadata: dockerExecutorMetadataSchema.partial(),
  }),
  z.object({
    type: z.literal('runtime'),
    metadata: runtimeExecutorMetadataSchema.partial(),
  }),
])

export const taskErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    name: z.string().optional(),
    code: z.string(),
    message: z.string(),
    details: jsonSerializableObjectSchema.optional(),
  }),
  requeueDelayMs: requeueSchema.optional(),
  executorMetadata: partialExecutorMetadataSchema,
})

export const taskSuccessResponseSchema = z.object({
  success: z.literal(true),
  result: jsonSerializableObjectSchema.optional(),
  executorMetadata: executorMetadataSchema,
})

export const taskCompletionSchema = z.discriminatedUnion('success', [
  taskErrorResponseSchema,
  taskSuccessResponseSchema,
])

export type TaskCompletion = z.infer<typeof taskCompletionSchema>

export type TaskDTO = z.infer<typeof taskDTOSchema>
