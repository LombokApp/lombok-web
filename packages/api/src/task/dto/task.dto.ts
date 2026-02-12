import {
  elaboratedTargetLocationContextDTOSchema,
  taskDTOSchema,
} from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'

export const taskSchemaWithTargetLocationContext = taskDTOSchema.extend({
  targetLocationContext: elaboratedTargetLocationContextDTOSchema.optional(),
})

export class TaskDTO extends createZodDto(taskDTOSchema) {}
export class TaskWithTargetLocationContextDTO extends createZodDto(
  taskSchemaWithTargetLocationContext,
) {}
