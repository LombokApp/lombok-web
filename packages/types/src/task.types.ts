import z from 'zod'

import {
  type JsonSerializableObject,
  jsonSerializableObjectSchema,
} from './apps.types'
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
