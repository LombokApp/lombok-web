import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const settingsSchema = z.object({
  SIGNUP_ENABLED: z.boolean().optional(),
  SIGNUP_PERMISSIONS: z.array(z.string()),
  SERVER_HOSTNAME: z.string().nullable(),
})

export class SettingsDTO extends createZodDto(settingsSchema) {}
