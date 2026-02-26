import { taskUpdateSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'

// The DTO wraps the taskUpdateSchema for NestJS validation
export class DockerJobUpdateRequestDTO extends createZodDto(taskUpdateSchema) {}
