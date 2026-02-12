import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { userDTOSchema } from '../user.dto'

export const viewerGetResponseSchema = z.object({
  user: userDTOSchema,
})

export class ViewerGetResponse extends createZodDto(viewerGetResponseSchema) {}
