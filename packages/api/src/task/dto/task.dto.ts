import { createZodDto } from '@anatine/zod-nestjs'
import {
  elaboratedTargetLocationContextSchema,
  jsonSerializableObjectSchema,
  targetLocationContextSchema,
  taskInputDataSchema,
  taskLogEntrySchema,
  taskSystemLogEntrySchema,
  taskTriggerSchema,
} from '@lombokapp/types'
import { z } from 'zod'

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

export const taskSchemaWithTargetLocationContext = taskSchema.extend({
  targetLocationContext: elaboratedTargetLocationContextSchema.optional(),
})

export class TaskDTO extends createZodDto(taskSchema) {}
export class TaskWithTargetLocationContextDTO extends createZodDto(
  taskSchemaWithTargetLocationContext,
) {}
