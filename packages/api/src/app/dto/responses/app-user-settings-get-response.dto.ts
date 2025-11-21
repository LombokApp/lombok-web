import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { appUserSettingsSchema } from '../app-user-settings.dto'

export const appUserSettingsGetResponseSchema = z.object({
  settings: appUserSettingsSchema,
})

export class AppUserSettingsGetResponseDTO extends createZodDto(
  appUserSettingsGetResponseSchema,
) {}
