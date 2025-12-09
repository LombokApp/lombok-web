import { createZodDto } from '@anatine/zod-nestjs'
import {
  elaboratedTargetLocationContextSchema,
  taskSchema,
} from '@lombokapp/types'

export const taskSchemaWithTargetLocationContext = taskSchema.extend({
  targetLocationContext: elaboratedTargetLocationContextSchema.optional(),
})

export class TaskDTO extends createZodDto(taskSchema) {}
export class TaskWithTargetLocationContextDTO extends createZodDto(
  taskSchemaWithTargetLocationContext,
) {}
