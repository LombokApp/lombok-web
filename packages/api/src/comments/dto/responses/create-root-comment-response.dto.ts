import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { commentResponseDTOSchema } from '../comment-response.dto'

export const createRootCommentResponseDTOSchema = z.object({
  comment: commentResponseDTOSchema,
})

export class CreateRootCommentResponseDTO extends createZodDto(
  createRootCommentResponseDTOSchema,
) {}
