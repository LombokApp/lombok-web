import type { WorkerClass } from '@stellariscloud/workers'

import type { LogLevel } from '../constants/logging.constants'

export interface ApiConfig {
  port: number
}

export interface AuthConfig {
  jwtSecret: string
  workerPublicKey: string
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

export interface MetadataLocationConfig {
  s3Endpoint: string
  s3Bucket: string
  s3Region: string
  s3AccessKeyId: string
  s3SecretAccessKey: string
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
  getMetadataLocationConfig: () => MetadataLocationConfig
  getLoggingConfig: () => LoggingConfig
  getSendgridConfig: () => SendgridConfig
  getRedisConfig: () => RedisConfig
  getInstanceClassConfig: () => InstanceClassConfig
}
