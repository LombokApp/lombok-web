import { registerAs } from '@nestjs/config'
import { parseEnv } from 'src/core/utils/config.util'
import * as z from 'zod'

export const appConfig = registerAs('app', () => {
  const env = parseEnv({
    APPS_LOCAL_PATH: z.string(),
  })
  return {
    appsLocalPath: env.APPS_LOCAL_PATH,
  }
})
