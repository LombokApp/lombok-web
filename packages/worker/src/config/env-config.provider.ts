import { EnumType } from '@stellariscloud/utils'
import { WorkerClass } from '@stellariscloud/workers'
import * as r from 'runtypes'
import type { RuntypeBase } from 'runtypes/lib/runtype'
import { singleton } from 'tsyringe'

import { LogLevel, LogLevelType } from '../constants/logging.constants'
import type {
  ConfigProvider,
  InstanceClassConfig,
  LoggingConfig,
  PreviewBucketConfig,
  RedisConfig,
  ServiceAuthConfig,
} from './config.interface'
import { EnvConfigError } from './env-config.error'

const isInteger = (value: string) =>
  String(parseInt(value, 10)) === value || `${value} is not an integer`

const parseEnv = <T extends Record<string, RuntypeBase>>(fields: T) => {
  const result = r.Record(fields).validate(process.env)

  if (result.success) {
    return result.value
  }

  throw new EnvConfigError(
    result as {
      success: false
      code: r.Failcode
      message: string
      details?: r.Details | undefined
    },
  )
}

@singleton()
export class EnvConfigProvider implements ConfigProvider {
  private serviceAuth?: ServiceAuthConfig

  getServiceAuthConfig() {
    if (!this.serviceAuth) {
      const env = parseEnv({
        JWT_SERVICE_TOKEN: r.String,
        SERVICE_BASE_URL: r.String,
      })

      this.serviceAuth = {
        jwtToken: env.JWT_SERVICE_TOKEN,
        baseUrl: env.SERVICE_BASE_URL,
      }
    }

    return this.serviceAuth
  }

  private logging?: LoggingConfig

  getLoggingConfig() {
    if (!this.logging) {
      const env = parseEnv({
        LOGDNA_KEY: r.String.optional(),
        LOGDNA_ENV: r.String.optional(),
        SENTRY_ENV: r.String.optional(),
        SENTRY_DSN: r.String.optional(),
        LOG_LEVEL: LogLevelType.optional(),
      })

      this.logging = {
        logDnaEnv: env.LOGDNA_ENV,
        logDnaKey: env.LOGDNA_KEY,
        sentryEnv: env.SENTRY_ENV,
        sentryKey: env.SENTRY_DSN,
        level: env.LOG_LEVEL ?? LogLevel.Info,
      }
    }

    return this.logging
  }

  private previewBucket?: PreviewBucketConfig

  getPreviewBucketConfig() {
    if (!this.previewBucket) {
      const env = parseEnv({
        PREVIEW_BUCKET_S3_ENDPOINT: r.String,
        PREVIEW_BUCKET_S3_BUCKET: r.String,
        PREVIEW_BUCKET_S3_REGION: r.String,
        PREVIEW_BUCKET_S3_ACCESS_KEY_ID: r.String,
        PREVIEW_BUCKET_S3_SECRET_ACCESS_KEY: r.String,
      })

      this.previewBucket = {
        s3AccessKeyId: env.PREVIEW_BUCKET_S3_ACCESS_KEY_ID,
        s3Endpoint: env.PREVIEW_BUCKET_S3_ENDPOINT,
        s3SecretAccessKey: env.PREVIEW_BUCKET_S3_SECRET_ACCESS_KEY,
        s3Region: env.PREVIEW_BUCKET_S3_REGION,
        s3Bucket: env.PREVIEW_BUCKET_S3_BUCKET,
      }
    }

    return this.previewBucket
  }

  private redis?: RedisConfig

  getRedisConfig() {
    if (!this.redis) {
      const env = parseEnv({
        REDIS_HOST: r.String,
        REDIS_PORT: r.String.withConstraint(isInteger).optional(),
        REDIS_MAX_RETRIES: r.String.withConstraint(isInteger).optional(),
      })

      this.redis = {
        host: env.REDIS_HOST,
        port:
          env.REDIS_PORT === undefined
            ? undefined
            : parseInt(env.REDIS_PORT, 10),
        maxRetries:
          env.REDIS_MAX_RETRIES === undefined
            ? undefined
            : parseInt(env.REDIS_MAX_RETRIES, 10),
      }
    }

    return this.redis
  }

  private instanceClass?: InstanceClassConfig

  getInstanceClassConfig() {
    if (!this.instanceClass) {
      const env = parseEnv({
        WORKER_CLASSES: r.String.withConstraint((value: string) => {
          const failed = value
            .split(',')
            .find((s) => !EnumType(WorkerClass).validate(s.trim()).success)

          if (failed) {
            return `Failed for ${failed}`
          }
          return true
        }).optional(),
      })

      this.instanceClass = {
        workerClasses: env.WORKER_CLASSES
          ? env.WORKER_CLASSES.split(',').map(
              (s) => (WorkerClass as any)[s.trim()],
            )
          : [],
      }
    }

    return this.instanceClass
  }
}
