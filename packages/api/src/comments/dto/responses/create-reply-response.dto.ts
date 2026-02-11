import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { commentResponseDTOSchema } from '../comment-response.dto'

export const createReplyResponseDTOSchema = z.object({
  comment: commentResponseDTOSchema,
})

export class CreateReplyResponseDTO extends createZodDto(
  createReplyResponseDTOSchema,
) {}
