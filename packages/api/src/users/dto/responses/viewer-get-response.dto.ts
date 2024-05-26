import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { userSchema } from '../user.dto'

export const viewerGetResponseSchema = z.object({
  user: userSchema,
})

export class ViewerGetResponse extends createZodDto(viewerGetResponseSchema) {}
