import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { adminAppSchema } from '../admin-app.dto'

export const appGetResponseSchema = z.object({
  app: adminAppSchema,
})

export class AppGetResponse extends createZodDto(appGetResponseSchema) {}
