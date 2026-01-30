import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { commentResponseDTOSchema } from '../comment-response.dto'

export const allCommentsListResponseDTOSchema = z.object({
  comments: z.array(commentResponseDTOSchema),
})

export class AllCommentsListResponseDTO extends createZodDto(
  allCommentsListResponseDTOSchema,
) {}
