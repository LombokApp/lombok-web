import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { taskSchema } from '../task.dto'

export const taskListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(taskSchema),
})

export class TaskListResponse extends createZodDto(taskListResponseSchema) {}
