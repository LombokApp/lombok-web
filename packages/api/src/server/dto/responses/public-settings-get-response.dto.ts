import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { publicSettingsSchema } from '../public-settings.dto'

export const publicSettingsGetResponseSchema = z.object({
  settings: publicSettingsSchema,
})

export class PublicSettingsGetResponse extends createZodDto(
  publicSettingsGetResponseSchema,
) {}
