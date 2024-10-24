import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'
import { TaskSort } from '../services/task.service'

export const tasksListQueryParamsSchema = z.object({
  objectKey: z.string().optional(),
  sort: z.nativeEnum(TaskSort).optional(),
  includeWaiting: z.literal('true').optional(),
  includeRunning: z.literal('true').optional(),
  includeComplete: z.literal('true').optional(),
  includeFailed: z.literal('true').optional(),
  offset: z
    .preprocess(
      (a) => parseInt(a as string, 10),
      z.number().refine((a) => a > -1),
    )
    .optional(),
  limit: z
    .preprocess((a) => parseInt(a as string, 10), z.number().positive())
    .optional(),
})

export class TasksListQueryParamsDTO extends createZodDto(
  tasksListQueryParamsSchema,
) {}
