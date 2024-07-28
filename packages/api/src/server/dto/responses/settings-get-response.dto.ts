import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { settingsSchema } from '../settings.dto'

export const settingsGetResponseSchema = z.object({
  settings: settingsSchema,
})

export class SettingsGetResponse extends createZodDto(
  settingsGetResponseSchema,
) {}
