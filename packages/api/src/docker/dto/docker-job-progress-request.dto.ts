import { taskProgressReportSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'

// The DTO wraps the taskProgressReportSchema for NestJS validation.
// This is the mid-execution worker-to-platform progress report payload,
// not to be confused with the async update broadcast channel on the
// app-user socket.
export class DockerJobProgressRequestDTO extends createZodDto(
  taskProgressReportSchema,
) {}
