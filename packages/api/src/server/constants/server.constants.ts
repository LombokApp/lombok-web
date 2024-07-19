export interface ServerConfigKey {
  private: boolean
  key: string
}

export const STORAGE_PROVISIONS_KEY: ServerConfigKey = {
  key: 'STORAGE_PROVISIONS',
  private: true,
}

export const SIGNUP_ENABLED_KEY: ServerConfigKey = {
  key: 'SIGNUP_ENABLED',
  private: false,
}

export const SERVER_HOSTNAME: ServerConfigKey = {
  key: 'SERVER_HOSTNAME',
  private: false,
}

export const SIGNUP_PERMISSIONS_KEY: ServerConfigKey = {
  key: 'SIGNUP_PERMISSIONS',
  private: true,
}

export const CONFIGURATION_KEYS = [
  STORAGE_PROVISIONS_KEY,
  SIGNUP_ENABLED_KEY,
  SIGNUP_PERMISSIONS_KEY,
  SERVER_HOSTNAME,
].reduce<{ [key: string]: ServerConfigKey }>(
  (acc, next) => ({ ...acc, [next.key]: next }),
  {},
)

export const PUBLIC_SERVER_CONFIGURATION_KEYS = Object.keys(
  CONFIGURATION_KEYS,
).reduce<typeof CONFIGURATION_KEYS>((acc, nextKey) => {
  return CONFIGURATION_KEYS[nextKey].private
    ? acc
    : { ...acc, [nextKey]: CONFIGURATION_KEYS[nextKey] }
}, {})
