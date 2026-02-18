import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const createMcpTokenResponseDTOSchema = z.object({
  tokenId: z.uuid(),
  rawToken: z.string(),
  clientName: z.string(),
  createdAt: z.iso.datetime(),
})

export class CreateMcpTokenResponseDTO extends createZodDto(
  createMcpTokenResponseDTOSchema,
) {}
