import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { taskSchemaWithTargetLocationContext } from '../task.dto'

export const taskGetResponseSchema = z.object({
  task: taskSchemaWithTargetLocationContext,
})

export class TaskGetResponse extends createZodDto(taskGetResponseSchema) {}
