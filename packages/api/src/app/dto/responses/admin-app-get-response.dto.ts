import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { adminAppDTOSchema } from '../admin-app.dto'

export const adminAppGetResponseSchema = z.object({
  app: adminAppDTOSchema,
})

export class AdminAppGetResponse extends createZodDto(
  adminAppGetResponseSchema,
) {}
