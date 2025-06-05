export interface ServerConfig {
  private: boolean
  key: string
  default?: unknown
}

export enum ServerConfigKey {
  USER_STORAGE_PROVISIONS = 'USER_STORAGE_PROVISIONS',
  SERVER_STORAGE_LOCATION = 'SERVER_STORAGE_LOCATION',
  SIGNUP_ENABLED = 'SIGNUP_ENABLED',
  SIGNUP_PERMISSIONS = 'SIGNUP_PERMISSIONS',
  SERVER_HOSTNAME = 'SERVER_HOSTNAME',
}

export const USER_STORAGE_PROVISIONS_CONFIG: ServerConfig = {
  key: ServerConfigKey.USER_STORAGE_PROVISIONS,
  private: true,
  default: null,
}

export const SERVER_STORAGE_LOCATION_CONFIG: ServerConfig = {
  key: ServerConfigKey.SERVER_STORAGE_LOCATION,
  private: true,
  default: null,
}

export const SIGNUP_ENABLED_CONFIG: ServerConfig = {
  key: ServerConfigKey.SIGNUP_ENABLED,
  private: false,
  default: true,
}

export const SERVER_HOSTNAME_CONFIG: ServerConfig = {
  key: ServerConfigKey.SERVER_HOSTNAME,
  private: false,
  default: null,
}

export const SIGNUP_PERMISSIONS_CONFIG: ServerConfig = {
  key: ServerConfigKey.SIGNUP_PERMISSIONS,
  private: true,
  default: [],
}

export const CONFIGURATION_KEYS = [
  USER_STORAGE_PROVISIONS_CONFIG,
  SERVER_STORAGE_LOCATION_CONFIG,
  SIGNUP_ENABLED_CONFIG,
  SIGNUP_PERMISSIONS_CONFIG,
  SERVER_HOSTNAME_CONFIG,
]

export const CONFIGURATION_KEYS_MAP = CONFIGURATION_KEYS.reduce<
  Record<string, ServerConfig>
>((acc, next) => ({ ...acc, [next.key]: next }), {})

export const PUBLIC_SERVER_CONFIGURATION_KEYS = Object.keys(
  CONFIGURATION_KEYS_MAP,
).reduce<typeof CONFIGURATION_KEYS_MAP>((acc, nextKey) => {
  return CONFIGURATION_KEYS_MAP[nextKey].private
    ? acc
    : { ...acc, [nextKey]: CONFIGURATION_KEYS_MAP[nextKey] }
}, {})
