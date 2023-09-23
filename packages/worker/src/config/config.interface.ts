import type { WorkerClass } from '@stellariscloud/workers'

import type { LogLevel } from '../constants/logging.constants'

export interface LoggingConfig {
  logDnaKey?: string
  logDnaEnv?: string
  sentryEnv?: string
  sentryKey?: string
  level: LogLevel
}

export interface PreviewBucketConfig {
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
}

export interface ServiceAuthConfig {
  jwtToken: string
  baseUrl: string
}

export interface ConfigProvider {
  getPreviewBucketConfig: () => PreviewBucketConfig
  getLoggingConfig: () => LoggingConfig
  getRedisConfig: () => RedisConfig
  getInstanceClassConfig: () => InstanceClassConfig
  getServiceAuthConfig: () => ServiceAuthConfig
}
