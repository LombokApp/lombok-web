import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const createReplyDTOSchema = z.object({
  content: z.string().min(1),
  quoteId: z.guid().optional(),
})

export class CreateReplyDTO extends createZodDto(createReplyDTOSchema) {}
