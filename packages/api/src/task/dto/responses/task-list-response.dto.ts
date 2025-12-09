import { createZodDto } from '@anatine/zod-nestjs'
import { taskSchema } from '@lombokapp/types'
import { z } from 'zod'

export const taskListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(taskSchema),
})

export class TaskListResponse extends createZodDto(taskListResponseSchema) {}
