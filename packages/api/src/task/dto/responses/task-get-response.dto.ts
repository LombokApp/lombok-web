import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { taskSchema } from '../task.dto'

export const taskGetResponseSchema = z.object({
  task: taskSchema,
})

export class TaskGetResponse extends createZodDto(taskGetResponseSchema) {}
