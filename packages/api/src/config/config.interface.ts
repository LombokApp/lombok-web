import type { WorkerClass } from '@stellariscloud/workers'

import type { LogLevel } from '../constants/logging.constants'

export interface ApiConfig {
  port: number
}

export interface AuthConfig {
  jwtSecret: string
  workerJwtSecret: string
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
}

export interface DbSeedConfig {
  enabled: boolean
}

export interface RedisConfig {
  host?: string
  port?: number
  maxRetries?: number
}

export interface InstanceClassConfig {
  workerClasses: WorkerClass[]
  serveAPI: boolean
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
  getSendgridConfig: () => SendgridConfig
  getRedisConfig: () => RedisConfig
  getInstanceClassConfig: () => InstanceClassConfig
}
