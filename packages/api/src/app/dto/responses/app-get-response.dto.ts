import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { appSchema } from '../app.dto'

export const appGetResponseSchema = z.object({
  app: appSchema,
})

export class AppGetResponse extends createZodDto(appGetResponseSchema) {}
