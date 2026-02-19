import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const mcpSettingsResponseDTOSchema = z.object({
  canRead: z.boolean().nullable(),
  canWrite: z.boolean().nullable(),
  canDelete: z.boolean().nullable(),
  canMove: z.boolean().nullable(),
})

export class McpSettingsResponseDTO extends createZodDto(
  mcpSettingsResponseDTOSchema,
) {}
