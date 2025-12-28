import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { taskSummaryWithTargetLocationContextDTOSchema } from '../task-summary.dto'

export const taskListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(taskSummaryWithTargetLocationContextDTOSchema),
})

export class TaskListResponse extends createZodDto(taskListResponseSchema) {}
