import z from 'zod'

import {
  type JsonSerializableObject,
  jsonSerializableObjectSchema,
} from './apps.types'
import { targetLocationContextSchema } from './folder.types'
import { SignedURLsRequestMethod } from './storage.types'

export type TaskInputData = JsonSerializableObject

export const taskInputDataSchema: z.ZodType<TaskInputData> =
  jsonSerializableObjectSchema

export const taskSystemLogEntrySchema = z.object({
  at: z.date(),
  payload: z.object({
    logType: z.enum(['started', 'failure', 'requeue', 'success']),
    data: jsonSerializableObjectSchema.optional(),
  }),
})

export const taskLogEntrySchema = z.object({
  at: z.date(),
  message: z.string().optional(),
  payload: jsonSerializableObjectSchema.optional(),
})

export type SystemLogEntry = z.infer<typeof taskSystemLogEntrySchema>
export type TaskLogEntry = z.infer<typeof taskLogEntrySchema>

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
  targetLocation: targetLocationContextSchema.optional(),
  eventData: jsonSerializableObjectSchema,
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

export const taskSchema = z.object({
  id: z.string().uuid(),
  taskIdentifier: z.string(),
  ownerIdentifier: z.string(),
  trigger: taskTriggerSchema,
  success: z.boolean().optional(),
  handlerIdentifier: z.string().optional(),
  data: taskInputDataSchema,
  targetLocation: targetLocationContextSchema.optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: jsonSerializableObjectSchema.optional(),
    })
    .optional(),
  taskDescription: z.string(),
  systemLog: z.array(taskSystemLogEntrySchema),
  taskLog: z.array(taskLogEntrySchema),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
