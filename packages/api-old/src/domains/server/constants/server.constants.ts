import * as r from 'runtypes'

export interface ServerConfigKey {
  private: boolean
  key: string
}

export const USER_METADATA_LOCATIONS_KEY: ServerConfigKey = {
  key: 'USER_METADATA_LOCATIONS',
  private: true,
}
export const USER_CONTENT_LOCATIONS_KEY: ServerConfigKey = {
  key: 'USER_CONTENT_LOCATIONS',
  private: true,
}
export const USER_BACKUP_LOCATIONS_KEY: ServerConfigKey = {
  key: 'USER_BACKUP_LOCATIONS',
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

export enum ServerLocationType {
  USER_METADATA = 'USER_METADATA',
  USER_CONTENT = 'USER_CONTENT',
  USER_BACKUP = 'USER_BACKUP',
}

export const ServerLocationTypeRunType = r.Union(
  r.Literal(ServerLocationType.USER_BACKUP),
  r.Literal(ServerLocationType.USER_CONTENT),
  r.Literal(ServerLocationType.USER_METADATA),
)

export const CONFIGURATION_KEYS = [
  USER_METADATA_LOCATIONS_KEY,
  USER_CONTENT_LOCATIONS_KEY,
  USER_BACKUP_LOCATIONS_KEY,
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
