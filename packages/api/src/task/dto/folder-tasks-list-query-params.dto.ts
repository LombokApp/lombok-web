import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { TaskSort } from '../services/task.service'

export const folderTasksListQueryParamsSchema = z.object({
  objectKey: z.string().optional(),
  sort: z.array(z.enum(TaskSort)).or(z.enum(TaskSort).optional()).optional(),
  search: z.string().optional(),
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
    .preprocess(
      (a) => parseInt(a as string, 10),
      z.number().refine((a) => a > 0),
    )
    .optional(),
})

export class FolderTasksListQueryParamsDTO extends createZodDto(
  folderTasksListQueryParamsSchema,
) {}
