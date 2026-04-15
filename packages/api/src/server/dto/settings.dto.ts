import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { CONFIGURATION_KEYS } from '../constants/server.constants'

export const settingsSchema = z.object(
  Object.fromEntries(
    CONFIGURATION_KEYS.map((config) => [
      config.key,
      config.responseSchema.nullable(),
    ]),
  ),
)

export class SettingsDTO extends createZodDto(settingsSchema) {}
