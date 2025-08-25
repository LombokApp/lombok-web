import { createZodDto } from '@anatine/zod-nestjs'
import { taskConfigSchema } from '@lombokapp/types'

export class TaskConfigDTO extends createZodDto(taskConfigSchema) {}
