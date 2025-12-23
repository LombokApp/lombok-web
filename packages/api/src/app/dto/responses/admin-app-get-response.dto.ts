import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { adminAppSchema } from '../admin-app.dto'

export const adminAppGetResponseSchema = z.object({
  app: adminAppSchema,
})

export class AdminAppGetResponse extends createZodDto(
  adminAppGetResponseSchema,
) {}
