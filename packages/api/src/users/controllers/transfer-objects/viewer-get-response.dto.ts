import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { userSchema } from './user.dto'

export const viewerGetResponseSchema = z.object({
  user: userSchema,
})

export class ViewerGetResponseDTO extends createZodDto(
  viewerGetResponseSchema,
) {}
