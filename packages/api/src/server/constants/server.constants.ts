import {
  emailProviderObfuscatedSchema,
  emailProviderSchema,
  serverStorageSchema,
  serverStorageSchemaWithSecret,
  storageProvisionSchema,
  storageProvisionWithSecretSchema,
} from '@lombokapp/types'
import { z } from 'zod'

import { searchConfigSchema } from '../dto/search-config.dto'
import { serverStorageInputSchema } from '../dto/server-storage-input.dto'

// Google OAuth configuration schema
export const googleOAuthConfigSchema = z.object({
  enabled: z.boolean(),
  clientId: z.string(),
  clientSecret: z.string(),
})

export const googleOAuthConfigObfuscatedSchema = googleOAuthConfigSchema.extend(
  {
    clientSecret: z.null(),
  },
)

export interface ServerSettingsEntry<
  T extends z.ZodType,
  I extends z.ZodType = T,
  R extends z.ZodType = T,
> {
  private: boolean
  key: string
  default?: z.infer<T> | null
  dbSchema: T
  inputSchema: I
  responseSchema: R
  transformForResponse: (value: z.infer<T> | null) => z.infer<R> | null
}

export const defineServerSettingsEntry = <
  T extends z.ZodType,
  I extends z.ZodType = T,
  R extends z.ZodType = T,
>(
  entry: ServerSettingsEntry<T, I, R>,
): ServerSettingsEntry<T, I, R> => entry

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

export const STORAGE_PROVISIONS_CONFIG = defineServerSettingsEntry({
  key: ServerConfigKey.STORAGE_PROVISIONS,
  private: true,
  default: [],
  dbSchema: storageProvisionWithSecretSchema.array(),
  inputSchema: z.never(),
  responseSchema: storageProvisionSchema.array(),
  transformForResponse: (value) => {
    if (!Array.isArray(value)) {
      return value
    }
    return value.map((storageProvision) => ({
      id: storageProvision.id,
      label: storageProvision.label,
      accessKeyId: storageProvision.accessKeyId,
      secretAccessKey: null,
      bucket: storageProvision.bucket,
      accessKeyHashId: storageProvision.accessKeyHashId,
      description: storageProvision.description,
      endpoint: storageProvision.endpoint,
      provisionTypes: storageProvision.provisionTypes,
      region: storageProvision.region,
      prefix: storageProvision.prefix,
    }))
  },
})

export const SERVER_STORAGE_CONFIG = defineServerSettingsEntry({
  key: ServerConfigKey.SERVER_STORAGE,
  private: true,
  default: null,
  dbSchema: serverStorageSchemaWithSecret,
  inputSchema: serverStorageInputSchema,
  responseSchema: serverStorageSchema,
  transformForResponse: (value) => {
    if (!value) {
      return value
    }
    return { ...value, secretAccessKey: null }
  },
})

export const SIGNUP_ENABLED_CONFIG = defineServerSettingsEntry({
  key: ServerConfigKey.SIGNUP_ENABLED,
  private: false,
  default: true,
  dbSchema: z.boolean(),
  inputSchema: z.boolean(),
  responseSchema: z.boolean(),
  transformForResponse: (value) => {
    if (!value) {
      return value
    }
    return value
  },
})

export const SERVER_HOSTNAME_CONFIG = defineServerSettingsEntry({
  key: ServerConfigKey.SERVER_HOSTNAME,
  private: false,
  default: null,
  dbSchema: z.string(),
  inputSchema: z.string(),
  responseSchema: z.string(),
  transformForResponse: (value) => {
    if (!value) {
      return value
    }
    return value
  },
})

export const SEARCH_CONFIG = defineServerSettingsEntry({
  key: ServerConfigKey.SEARCH_CONFIG,
  private: true,
  default: { app: null },
  dbSchema: searchConfigSchema,
  inputSchema: searchConfigSchema,
  responseSchema: searchConfigSchema,
  transformForResponse: (value) => {
    if (!value) {
      return value
    }
    return value
  },
})

export const SIGNUP_PERMISSIONS_CONFIG = defineServerSettingsEntry({
  key: ServerConfigKey.SIGNUP_PERMISSIONS,
  private: true,
  default: [],
  dbSchema: z.array(z.string()),
  inputSchema: z.array(z.string()),
  responseSchema: z.array(z.string()),
  transformForResponse: (value) => {
    if (!Array.isArray(value)) {
      return value
    }
    return value.map((v) => v)
  },
})

export const GOOGLE_OAUTH_CONFIG = defineServerSettingsEntry({
  key: ServerConfigKey.GOOGLE_OAUTH_CONFIG,
  private: true,
  default: null,
  dbSchema: googleOAuthConfigSchema,
  inputSchema: googleOAuthConfigSchema,
  responseSchema: googleOAuthConfigObfuscatedSchema,
  transformForResponse: (value) => {
    if (!value) {
      return value
    }

    return {
      ...value,
      clientSecret: null,
    }
  },
})

export const EMAIL_PROVIDER_CONFIG = defineServerSettingsEntry({
  key: ServerConfigKey.EMAIL_PROVIDER_CONFIG,
  private: true,
  default: null,
  dbSchema: emailProviderSchema.nullable(),
  inputSchema: emailProviderSchema.nullable(),
  responseSchema: emailProviderObfuscatedSchema,
  transformForResponse: (value) => {
    if (!value) {
      return value
    }
    return {
      ...value,
      config: Object.fromEntries(
        Object.entries(value.config).map(([key, _value]) => [
          key,
          !['apiKey', 'password'].includes(key) ? _value : null,
        ]),
      ),
    } as z.infer<typeof emailProviderObfuscatedSchema>
  },
})

export const CONFIGURATION_KEYS: ServerSettingsEntry<z.ZodType>[] = [
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
  Record<string, ServerSettingsEntry<z.ZodType>>
>((acc, next) => ({ ...acc, [next.key]: next }), {})

export const PUBLIC_SERVER_CONFIGURATION_KEYS = Object.keys(
  CONFIGURATION_KEYS_MAP,
).reduce<typeof CONFIGURATION_KEYS_MAP>((acc, nextKey) => {
  return CONFIGURATION_KEYS_MAP[nextKey]?.private
    ? acc
    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      { ...acc, [nextKey]: CONFIGURATION_KEYS_MAP[nextKey]! }
}, {})
