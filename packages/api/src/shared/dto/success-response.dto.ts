import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const successResponseDTOSchema = z.object({
  success: z.boolean(),
})

export class SuccessResponseDTO extends createZodDto(
  successResponseDTOSchema,
) {}
