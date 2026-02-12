import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const apiErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
})

export class ApiErrorResponseDTO extends createZodDto(apiErrorResponseSchema) {}
