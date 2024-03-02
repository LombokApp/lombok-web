import { registerAs } from '@nestjs/config'
import * as r from 'runtypes'

import { isInteger, parseEnv } from '../core/utils/config.util'

export const redisConfig = registerAs('redis', () => {
  const env = parseEnv({
    REDIS_HOST: r.String,
    REDIS_PORT: r.String.withConstraint(isInteger),
  })
  return {
    host: env.REDIS_HOST,
    port: parseInt(env.REDIS_PORT, 10),
  }
})
