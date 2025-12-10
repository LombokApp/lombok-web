import z from 'zod'

import {
  type JsonSerializableObject,
  jsonSerializableObjectDTOSchema,
} from './apps.types'
import { targetLocationContextDTOSchema } from './folder.types'
import { SignedURLsRequestMethod } from './storage.types'

export type TaskInputData = JsonSerializableObject

export const taskInputDataSchema: z.ZodType<TaskInputData> =
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

export const taskTriggerSchema = z.discriminatedUnion('kind', [
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
])

export type TaskTrigger = z.infer<typeof taskTriggerSchema>

export interface EventTaskTrigger {
  kind: 'event'
  data: z.infer<typeof eventTriggerDataSchema>
}

export const taskDTOSchema = z.object({
  id: z.string().uuid(),
  taskIdentifier: z.string(),
  ownerIdentifier: z.string(),
  trigger: taskTriggerSchema,
  success: z.boolean().optional(),
  handlerIdentifier: z.string().optional(),
  data: taskInputDataSchema,
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
