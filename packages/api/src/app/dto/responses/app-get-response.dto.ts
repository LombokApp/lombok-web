import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { adminAppDTOSchema } from '../admin-app.dto'

export const appGetResponseSchema = z.object({
  app: adminAppDTOSchema,
})

export class AppGetResponse extends createZodDto(appGetResponseSchema) {}
