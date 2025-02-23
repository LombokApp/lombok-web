import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const taskSchema = z.object({
  id: z.string(),
  taskKey: z.string(),
  ownerIdentifier: z.string(),
  triggeringEventId: z.string(),
  subjectFolderId: z.string().optional(),
  subjectObjectKey: z.string().optional(),
  handlerId: z.string().optional(),
  inputData: z.record(z.string(), z.string().or(z.number())),
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
