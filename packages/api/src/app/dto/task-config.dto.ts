import { taskConfigSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'

export class TaskConfigDTO extends createZodDto(taskConfigSchema) {}
