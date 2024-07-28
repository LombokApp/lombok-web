import { registerAs } from '@nestjs/config'
import * as r from 'runtypes'
import { parseEnv } from 'src/core/utils/config.util'

export const authConfig = registerAs('auth', () => {
  const env = parseEnv({
    AUTH_JWT_SECRET: r.String,
  })
  return {
    authJwtSecret: env.AUTH_JWT_SECRET,
  }
})
