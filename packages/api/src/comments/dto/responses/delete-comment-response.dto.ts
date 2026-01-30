import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const deleteCommentResponseDTOSchema = z.object({
  success: z.boolean(),
})

export class DeleteCommentResponseDTO extends createZodDto(
  deleteCommentResponseDTOSchema,
) {}
