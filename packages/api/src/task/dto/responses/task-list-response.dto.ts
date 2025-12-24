import { createZodDto } from '@anatine/zod-nestjs'
import { taskDTOSchema } from '@lombokapp/types'
import { z } from 'zod'

export const taskListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(taskDTOSchema),
})

export class TaskListResponse extends createZodDto(taskListResponseSchema) {}
