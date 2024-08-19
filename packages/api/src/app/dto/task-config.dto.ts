import { createZodDto } from '@anatine/zod-nestjs'
import { taskConfigSchema } from '@stellariscloud/types'

export class TaskConfigDTO extends createZodDto(taskConfigSchema) {}
