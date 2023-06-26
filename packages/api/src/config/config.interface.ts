import type { LogLevel } from '../constants/logging.constants'
import type { WorkerClass } from '../constants/worker-class.constants'

export interface ApiConfig {
  port: number
}

export interface AuthConfig {
  jwtSecret: string
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
  demoS3Endpoint: string
  demoS3Bucket: string
  demoS3Region: string
  demoS3AccessKeyId: string
  demoS3SecretAccessKey: string
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

export interface ConfigProvider {
  getApiConfig: () => ApiConfig
  getAuthConfig: () => AuthConfig
  getDbConfig: () => DbConfig
  getDbSeedConfig: () => DbSeedConfig
  getLoggingConfig: () => LoggingConfig
  getRedisConfig: () => RedisConfig
  getInstanceClassConfig: () => InstanceClassConfig
}
