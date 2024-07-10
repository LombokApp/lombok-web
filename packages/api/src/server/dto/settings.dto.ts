import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const settingsSchema = z.object({
  SIGNUP_ENABLED: z.boolean().optional(),
  SERVER_HOSTNAME: z.string().optional(),
})

export class SettingsDTO extends createZodDto(settingsSchema) {}
