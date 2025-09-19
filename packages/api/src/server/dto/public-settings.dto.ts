import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const publicSettingsSchema = z.object({
  SIGNUP_ENABLED: z.boolean().optional(),
  GOOGLE_OAUTH_ENABLED: z.boolean().optional(),
})

export class PublicSettingsDTO extends createZodDto(publicSettingsSchema) {}
