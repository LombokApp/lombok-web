import { WorkerClass } from '@stellariscloud/workers'
import * as r from 'runtypes'
import type { RuntypeBase } from 'runtypes/lib/runtype'
import { singleton } from 'tsyringe'

import { LogLevel, LogLevelType } from '../constants/logging.constants'
import { EnumType } from '../util/types.util'
import type {
  ApiConfig,
  AuthConfig,
  ConfigProvider,
  DbConfig,
  DbSeedConfig,
  InstanceClassConfig,
  LoggingConfig,
  RedisConfig,
  SendgridConfig,
} from './config.interface'
import { EnvConfigError } from './env-config.error'

const minLength = (length: number) => (value: string) =>
  value.length >= length || `must be at lest ${length} chars`

const isBoolean = (value: string) =>
  ['0', 'false', '1', 'true'].includes(value) || `${value} is not a boolean`

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
  private api?: ApiConfig

  getApiConfig() {
    if (!this.api) {
      const env = parseEnv({
        API_PORT: r.String.withConstraint(isInteger),
        APP_HOST_ID: r.String,
      })

      this.api = {
        port: parseInt(env.API_PORT, 10),
        hostId: env.APP_HOST_ID,
      }
    }

    return this.api
  }

  private auth?: AuthConfig

  getAuthConfig() {
    if (!this.auth) {
      const env = parseEnv({
        AUTH_JWT_SECRET: r.String.withConstraint(minLength(32)),
        WORKER_JWT_SECRET: r.String.withConstraint(minLength(32)),
      })

      this.auth = {
        jwtSecret: env.AUTH_JWT_SECRET,
        workerJwtSecret: env.WORKER_JWT_SECRET,
      }
    }

    return this.auth
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

  private db?: DbConfig

  getDbConfig() {
    if (!this.db) {
      const env = parseEnv({
        DB_HOST: r.String.optional(),
        DB_NAME: r.String,
        DB_PASSWORD: r.String,
        DB_PORT: r.String.withConstraint(isInteger).optional(),
        DB_RUN_MIGRATIONS: r.String.optional(),
        DB_USER: r.String,
      })

      this.db = {
        host: env.DB_HOST,
        port: env.DB_PORT === undefined ? undefined : parseInt(env.DB_PORT, 10),
        name: env.DB_NAME,
        password: env.DB_PASSWORD,
        runMigrations:
          env.DB_RUN_MIGRATIONS === 'true' || env.DB_RUN_MIGRATIONS === '1',
        user: env.DB_USER,
      }
    }

    return this.db
  }

  private dbSeed?: DbSeedConfig

  getDbSeedConfig() {
    if (!this.dbSeed) {
      const env = parseEnv({
        DB_SEED_ENABLED: r.String.optional(),
      })

      this.dbSeed = {
        enabled: env.DB_SEED_ENABLED === 'true' || env.DB_SEED_ENABLED === '1',
      }
    }

    return this.dbSeed
  }

  private sendgrid?: SendgridConfig

  getSendgridConfig() {
    if (!this.sendgrid) {
      const env = parseEnv({
        SENDGRID_API_KEY: r.String,
      })

      this.sendgrid = {
        apiKey: env.SENDGRID_API_KEY,
      }
    }

    return this.sendgrid
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
        SERVE_API: r.String.withConstraint(isBoolean).optional(),
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
        serveAPI: env.SERVE_API === 'true' || env.SERVE_API === '1',
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
