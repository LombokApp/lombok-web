import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const addReactionDTOSchema = z.object({
  emoji: z.string().min(1),
})

export class AddReactionDTO extends createZodDto(addReactionDTOSchema) {}
