import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import type { TaskInputData } from '../entities/task.entity'

// Create a recursive schema for TaskInputData
const taskInputDataSchema: z.ZodType<TaskInputData> = z.lazy(() =>
  z.record(z.string(), z.union([z.string(), z.number(), taskInputDataSchema])),
)

export const taskSchema = z.object({
  id: z.string().uuid(),
  taskIdentifier: z.string(),
  ownerIdentifier: z.string(),
  triggeringEventId: z.string().uuid(),
  subjectFolderId: z.string().uuid().optional(),
  subjectObjectKey: z.string().optional(),
  handlerId: z.string().optional(),
  inputData: taskInputDataSchema,
  errorAt: z.date().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  taskDescription: z.object({
    textKey: z.string(),
    variables: z.record(z.string(), z.string()),
  }),
  updates: z.array(z.any()),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export class TaskDTO extends createZodDto(taskSchema) {}
