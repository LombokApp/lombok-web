import { createZodDto } from '@anatine/zod-nestjs'
import {
  subjectContextSchema,
  taskInputDataSchema,
  workerErrorDetailsSchema,
} from '@lombokapp/types'
import { z } from 'zod'

export const taskSchema = z.object({
  id: z.string().uuid(),
  taskIdentifier: z.string(),
  ownerIdentifier: z.string(),
  triggeringEventId: z.string().uuid(),
  subjectFolderId: z.string().uuid().optional(),
  subjectObjectKey: z.string().optional(),
  handlerIdentifier: z.string().optional(),
  inputData: taskInputDataSchema,
  errorAt: z.date().optional(),
  errorCode: z.string().optional(),
  errorDetails: workerErrorDetailsSchema.optional(),
  errorMessage: z.string().optional(),
  taskDescription: z.string(),
  updates: z.array(z.any()),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  subjectContext: subjectContextSchema.optional(),
})

export class TaskDTO extends createZodDto(taskSchema) {}
