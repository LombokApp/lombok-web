import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const createReplyDTOSchema = z.object({
  content: z.string().min(1),
  quoteId: z.string().uuid().optional(),
})

export class CreateReplyDTO extends createZodDto(createReplyDTOSchema) {}
