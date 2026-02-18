import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const mcpSuccessResponseDTOSchema = z.object({
  success: z.boolean(),
})

export class McpSuccessResponseDTO extends createZodDto(
  mcpSuccessResponseDTOSchema,
) {}
