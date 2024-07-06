import { registerAs } from '@nestjs/config'
import * as r from 'runtypes'
import { parseEnv } from 'src/core/utils/config.util'

export const appConfig = registerAs('app', () => {
  const env = parseEnv({
    APPS_LOCAL_PATH: r.String,
  })
  return {
    appsLocalPath: env.APPS_LOCAL_PATH,
  }
})
