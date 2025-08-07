import { registerAs } from '@nestjs/config'
import { parseEnv } from 'src/platform/utils/config.util'
import { z } from 'zod'

export const appConfig = registerAs('app', () => {
  const env = parseEnv({
    APPS_LOCAL_PATH: z.string(),
  })
  return {
    appsLocalPath: env.APPS_LOCAL_PATH,
  }
})
