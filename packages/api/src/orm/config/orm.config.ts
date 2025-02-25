import { registerAs } from '@nestjs/config'
import { isBoolean, isInteger, parseEnv } from 'src/core/utils/config.util'
import * as z from 'zod'

export const ormConfig = registerAs('orm', () => {
  const env = parseEnv({
    DB_HOST: z.string(),
    DB_USER: z.string(),
    DB_PORT: z.string().refine(isInteger),
    DB_NAME: z.string(),
    DB_PASSWORD: z.string(),
    DISABLE_NOTICE_LOGGING: z.string().refine(isBoolean).optional(),
    RUN_MIGRATIONS: z.string().refine(isBoolean).optional(),
    CREATE_DATABASE: z.string().refine(isBoolean).optional(),
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
