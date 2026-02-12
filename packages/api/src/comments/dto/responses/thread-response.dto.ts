import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { commentResponseDTOSchema } from '../comment-response.dto'

export const threadResponseDTOSchema = z.object({
  comments: z.array(commentResponseDTOSchema),
})

export class ThreadResponseDTO extends createZodDto(threadResponseDTOSchema) {}
