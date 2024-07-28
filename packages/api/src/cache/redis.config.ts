import { registerAs } from '@nestjs/config'
import * as r from 'runtypes'

import { isInteger, parseEnv } from '../core/utils/config.util'

export const redisConfig = registerAs('redis', () => {
  const env = parseEnv({
    REDIS_ENABLED: r.String.optional(),
    REDIS_HOST: r.String,
    REDIS_PORT: r.String.withConstraint(isInteger),
  })
  return {
    enabled: env.REDIS_ENABLED === '1' || env.REDIS_ENABLED === 'true',
    host: env.REDIS_HOST,
    port: parseInt(env.REDIS_PORT, 10),
  }
})
