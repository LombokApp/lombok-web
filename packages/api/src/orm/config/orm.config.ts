import { registerAs } from '@nestjs/config'
import { isBoolean, isInteger, parseEnv } from 'src/platform/utils/config.util'
import { z } from 'zod'

const EMBEDDED_POSTGRES = process.env.EMBEDDED_POSTGRES === 'true'

export const ormConfig = registerAs('orm', () => {
  const env = parseEnv({
    DB_HOST: EMBEDDED_POSTGRES
      ? z.undefined({
          message: 'Should not set DB_HOST when EMBEDDED_POSTGRES=true',
        })
      : z.string().nonempty(),
    DB_USER: z.string().nonempty(),
    DB_PORT: EMBEDDED_POSTGRES
      ? z.undefined({
          message: 'Should not set DB_PORT when EMBEDDED_POSTGRES=true',
        })
      : z.string().refine(isInteger),
    DB_NAME: z.string().nonempty(),
    DB_PASSWORD: z.string().nonempty(),
    RUN_MIGRATIONS: z.string().refine(isBoolean).optional(),
    LOG_QUERIES: z.string().refine(isBoolean).optional(),
    CREATE_DATABASE: z.string().refine(isBoolean).optional(),
  })
  return {
    dbHost: env.DB_HOST ?? 'localhost',
    dbPort: env.DB_PORT ? parseInt(env.DB_PORT, 10) : 5432,
    dbUser: env.DB_USER,
    dbPassword: env.DB_PASSWORD,
    dbName: env.DB_NAME,
    logQueries: !!env.LOG_QUERIES && ['1', 'true'].includes(env.LOG_QUERIES),
    runMigrations:
      !!env.RUN_MIGRATIONS && ['1', 'true'].includes(env.RUN_MIGRATIONS),
    createDatabase:
      !!env.CREATE_DATABASE && ['1', 'true'].includes(env.CREATE_DATABASE),
  }
})
