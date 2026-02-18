import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const createMcpTokenInputDTOSchema = z.object({
  clientName: z.string().min(1).max(100),
})

export class CreateMcpTokenInputDTO extends createZodDto(
  createMcpTokenInputDTOSchema,
) {}
