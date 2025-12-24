import { createZodDto } from '@anatine/zod-nestjs'
import {
  elaboratedTargetLocationContextDTOSchema,
  taskDTOSchema,
} from '@lombokapp/types'

export const taskSchemaWithTargetLocationContext = taskDTOSchema.extend({
  targetLocationContext: elaboratedTargetLocationContextDTOSchema.optional(),
})

export class TaskDTO extends createZodDto(taskDTOSchema) {}
export class TaskWithTargetLocationContextDTO extends createZodDto(
  taskSchemaWithTargetLocationContext,
) {}
