import { z } from 'zod'

import { searchConfigSchema } from '../dto/search-config.dto'
import { serverStorageInputSchema } from '../dto/server-storage-input.dto'
import { storageProvisionInputSchema } from '../dto/storage-provision-input.dto'
import { emailProviderConfigNullableSchema } from '../schemas/email-provider-config.schema'

// Google OAuth configuration schema
export const googleOAuthConfigSchema = z.object({
  enabled: z.boolean(),
  clientId: z.string(),
  clientSecret: z.string(),
})

export interface ServerConfig<T extends z.ZodSchema = z.ZodSchema> {
  private: boolean
  key: string
  default?: z.infer<T> | null
  schema: T
}

export enum ServerConfigKey {
  STORAGE_PROVISIONS = 'STORAGE_PROVISIONS',
  SERVER_STORAGE = 'SERVER_STORAGE',
  SIGNUP_ENABLED = 'SIGNUP_ENABLED',
  SIGNUP_PERMISSIONS = 'SIGNUP_PERMISSIONS',
  SERVER_HOSTNAME = 'SERVER_HOSTNAME',
  SEARCH_CONFIG = 'SEARCH_CONFIG',
  GOOGLE_OAUTH_CONFIG = 'GOOGLE_OAUTH_CONFIG',
  EMAIL_PROVIDER_CONFIG = 'EMAIL_PROVIDER_CONFIG',
}

export const STORAGE_PROVISIONS_CONFIG: ServerConfig<
  typeof storageProvisionInputSchema
> = {
  key: ServerConfigKey.STORAGE_PROVISIONS,
  private: true,
  default: undefined,
  schema: storageProvisionInputSchema,
}

export const SERVER_STORAGE_CONFIG: ServerConfig<
  typeof serverStorageInputSchema
> = {
  key: ServerConfigKey.SERVER_STORAGE,
  private: true,
  default: undefined,
  schema: serverStorageInputSchema,
}

export const SIGNUP_ENABLED_CONFIG: ServerConfig<z.ZodBoolean> = {
  key: ServerConfigKey.SIGNUP_ENABLED,
  private: false,
  default: true,
  schema: z.boolean(),
}

export const SERVER_HOSTNAME_CONFIG: ServerConfig<z.ZodString> = {
  key: ServerConfigKey.SERVER_HOSTNAME,
  private: false,
  default: null,
  schema: z.string(),
}

export const SEARCH_CONFIG: ServerConfig<typeof searchConfigSchema> = {
  key: ServerConfigKey.SEARCH_CONFIG,
  private: true,
  default: { app: null },
  schema: searchConfigSchema,
}

export const SIGNUP_PERMISSIONS_CONFIG: ServerConfig<z.ZodArray<z.ZodString>> =
  {
    key: ServerConfigKey.SIGNUP_PERMISSIONS,
    private: true,
    default: [],
    schema: z.array(z.string()),
  }

export const GOOGLE_OAUTH_CONFIG: ServerConfig<typeof googleOAuthConfigSchema> =
  {
    key: ServerConfigKey.GOOGLE_OAUTH_CONFIG,
    private: true,
    default: {
      enabled: false,
      clientId: '',
      clientSecret: '',
    },
    schema: googleOAuthConfigSchema,
  }

export const EMAIL_PROVIDER_CONFIG: ServerConfig<
  typeof emailProviderConfigNullableSchema
> = {
  key: ServerConfigKey.EMAIL_PROVIDER_CONFIG,
  private: true,
  default: null,
  schema: emailProviderConfigNullableSchema,
}

export const CONFIGURATION_KEYS = [
  STORAGE_PROVISIONS_CONFIG,
  SERVER_STORAGE_CONFIG,
  SIGNUP_ENABLED_CONFIG,
  SIGNUP_PERMISSIONS_CONFIG,
  SERVER_HOSTNAME_CONFIG,
  GOOGLE_OAUTH_CONFIG,
  EMAIL_PROVIDER_CONFIG,
  SEARCH_CONFIG,
]

export const CONFIGURATION_KEYS_MAP = CONFIGURATION_KEYS.reduce<
  Record<string, ServerConfig>
>((acc, next) => ({ ...acc, [next.key]: next }), {})

export const PUBLIC_SERVER_CONFIGURATION_KEYS = Object.keys(
  CONFIGURATION_KEYS_MAP,
).reduce<typeof CONFIGURATION_KEYS_MAP>((acc, nextKey) => {
  return CONFIGURATION_KEYS_MAP[nextKey]?.private
    ? acc
    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      { ...acc, [nextKey]: CONFIGURATION_KEYS_MAP[nextKey]! }
}, {})
