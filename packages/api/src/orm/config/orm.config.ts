import { registerAs } from '@nestjs/config'
import * as r from 'runtypes'
import { isBoolean, isInteger, parseEnv } from 'src/core/utils/config.util'

export const ormConfig = registerAs('orm', () => {
  const env = parseEnv({
    DB_HOST: r.String,
    DB_USER: r.String,
    DB_PORT: r.String.withConstraint(isInteger),
    DB_NAME: r.String,
    DB_PASSWORD: r.String,
    DISABLE_NOTICE_LOGGING: r.String.withConstraint(isBoolean).optional(),
    RUN_MIGRATIONS: r.String.withConstraint(isBoolean).optional(),
    CREATE_DATABASE: r.String.withConstraint(isBoolean).optional(),
  })
  return {
    dbHost: env.DB_HOST,
    dbPort: parseInt(env.DB_PORT, 10),
    dbUser: env.DB_USER,
    dbPassword: env.DB_PASSWORD,
    dbName: env.DB_NAME,
    disableNoticeLogging:
      env.DISABLE_NOTICE_LOGGING === '1' ||
      env.DISABLE_NOTICE_LOGGING === 'true',
    runMigrations: env.RUN_MIGRATIONS === '1' || env.RUN_MIGRATIONS === 'true',
    createDatabase:
      env.CREATE_DATABASE === '1' || env.CREATE_DATABASE === 'true',
  }
})
