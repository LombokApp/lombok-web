import { registerAs } from '@nestjs/config'
import { parseEnv } from 'src/platform/utils/config.util'
import { z } from 'zod'

export const appConfig = registerAs('app', () => {
  const env = parseEnv({
    APP_BUNDLES_PATH: z.string().optional(),
  })
  return {
    appBundlesPath: env.APP_BUNDLES_PATH,
  }
})
