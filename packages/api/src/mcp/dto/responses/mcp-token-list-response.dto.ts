import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const mcpTokenDTOSchema = z.object({
  id: z.uuid(),
  clientName: z.string(),
  createdAt: z.iso.datetime(),
  lastUsedAt: z.iso.datetime().nullable(),
})

export const mcpTokenListResponseDTOSchema = z.object({
  tokens: z.array(mcpTokenDTOSchema),
})

export class McpTokenListResponseDTO extends createZodDto(
  mcpTokenListResponseDTOSchema,
) {}
