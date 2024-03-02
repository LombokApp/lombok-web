import { registerAs } from '@nestjs/config'
import * as r from 'runtypes'

import { isBoolean, isInteger, parseEnv } from '../utils/config.util'

export const coreConfig = registerAs('core', () => {
  const env = parseEnv({
    API_PORT: r.String.withConstraint(isInteger),
    APP_HOST_ID: r.String,
    DISABLE_HTTP: r.String.withConstraint(isBoolean).optional(),
  })
  return {
    port: parseInt(env.API_PORT, 10),
    hostId: env.APP_HOST_ID,
    disableHttp: env.DISABLE_HTTP === '1' || env.DISABLE_HTTP === 'true',
  }
})
