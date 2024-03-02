import type { LogLevel } from '../constants/logging.constants'

export interface ApiConfig {
  port: number
  hostId: string
  disableHttp: boolean
}

export interface CoreModuleConfig {
  embeddedCoreModuleToken?: string
}

export interface AuthConfig {
  jwtSecret: string
}

export interface ModulesConfig {
  modulesDirectory: string
}

export interface LoggingConfig {
  logDnaKey?: string
  logDnaEnv?: string
  sentryEnv?: string
  sentryKey?: string
  level: LogLevel
}

export interface DbConfig {
  host?: string
  name: string
  password: string
  port?: number
  runMigrations: boolean
  user: string
  disableNoticeLogging: boolean
}

export interface DbSeedConfig {
  enabled: boolean
}

export interface RedisConfig {
  host?: string
  port?: number
}

export interface SendgridConfig {
  apiKey: string
}

export interface ConfigProvider {
  getApiConfig: () => ApiConfig
  getAuthConfig: () => AuthConfig
  getDbConfig: () => DbConfig
  getDbSeedConfig: () => DbSeedConfig
  getLoggingConfig: () => LoggingConfig
  getModulesConfig: () => ModulesConfig
  getSendgridConfig: () => SendgridConfig
  getRedisConfig: () => RedisConfig
  getCoreModuleConfig: () => CoreModuleConfig
}
