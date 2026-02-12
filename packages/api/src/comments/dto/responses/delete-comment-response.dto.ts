import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const deleteCommentResponseDTOSchema = z.object({
  success: z.boolean(),
})

export class DeleteCommentResponseDTO extends createZodDto(
  deleteCommentResponseDTOSchema,
) {}
