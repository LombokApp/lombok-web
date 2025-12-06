import { createZodDto } from '@anatine/zod-nestjs'
import {
  jsonSerializableObjectSchema,
  subjectContextSchema,
  taskInputDataSchema,
  taskLogEntrySchema,
  taskSystemLogEntrySchema,
} from '@lombokapp/types'
import { z } from 'zod'

export const taskSchema = z.object({
  id: z.string().uuid(),
  taskIdentifier: z.string(),
  ownerIdentifier: z.string(),
  eventId: z.string().uuid(),
  subjectFolderId: z.string().uuid().optional(),
  subjectObjectKey: z.string().optional(),
  success: z.boolean().optional(),
  handlerIdentifier: z.string().optional(),
  inputData: taskInputDataSchema,
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

export const taskSchemaWithFolderSubjectContext = taskSchema.extend({
  subjectContext: subjectContextSchema.optional(),
})

export class TaskDTO extends createZodDto(taskSchema) {}
export class TaskWithFolderSubjectContextDTO extends createZodDto(
  taskSchemaWithFolderSubjectContext,
) {}
