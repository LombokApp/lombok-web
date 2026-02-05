import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { googleOAuthConfigSchema } from '../constants/server.constants'
import { emailProviderConfigNullableSchema } from '../schemas/email-provider-config.schema'
import { searchConfigSchema } from './search-config.dto'

export const settingsSchema = z.object({
  SIGNUP_ENABLED: z.boolean().optional(),
  SIGNUP_PERMISSIONS: z.array(z.string()),
  SERVER_HOSTNAME: z.string().nullable(),
  GOOGLE_OAUTH_CONFIG: googleOAuthConfigSchema.optional(),
  STORAGE_PROVISIONS: z.array(z.unknown()).optional(),
  SERVER_STORAGE: z.unknown().optional(),
  EMAIL_PROVIDER_CONFIG: emailProviderConfigNullableSchema.optional(),
  SEARCH_CONFIG: searchConfigSchema.optional(),
})

export class SettingsDTO extends createZodDto(settingsSchema) {}
