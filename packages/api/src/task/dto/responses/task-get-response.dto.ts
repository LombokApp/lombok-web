import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { taskSchemaWithTargetLocationContext } from '../task.dto'

export const taskGetResponseSchema = z.object({
  task: taskSchemaWithTargetLocationContext,
})

export class TaskGetResponse extends createZodDto(taskGetResponseSchema) {}
