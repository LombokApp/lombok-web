import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { taskSchema } from '../dto/task.dto'

export const eventListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(taskSchema),
})

export class EventListResponse extends createZodDto(eventListResponseSchema) {}
