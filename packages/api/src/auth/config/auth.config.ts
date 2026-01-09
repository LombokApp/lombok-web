import { registerAs } from '@nestjs/config'
import { parseEnv } from 'src/core/utils/config.util'
import { z } from 'zod'

export const authConfig = registerAs('auth', () => {
  const env = parseEnv({
    AUTH_JWT_SECRET: z.string(),
  })
  return {
    authJwtSecret: env.AUTH_JWT_SECRET,
  }
})
