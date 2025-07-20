import { registerAs } from '@nestjs/config'
import { z } from 'zod'

import { isBoolean, parseEnv } from '../utils/config.util'

export const coreConfig = registerAs('core', () => {
  const env = parseEnv({
    INSTALL_APPS_ON_START: z.string().refine(isBoolean).optional(),
    APP_HOST_ID: z.string(),
    INITIAL_USER: z.string().optional(),
    DISABLE_EMBEDDED_CORE_APP_WORKER: z.string().refine(isBoolean).optional(),
    INIT_EVENT_JOBS: z.string().refine(isBoolean).optional(),
    EMBEDDED_CORE_APP_TOKEN: z.string().optional(),
  })
  return {
    installAppsOnStart: !!(
      env.INSTALL_APPS_ON_START === '1' || env.INSTALL_APPS_ON_START === 'true'
    ),
    hostId: env.APP_HOST_ID,
    initialUser: env.INITIAL_USER,
    disableEmbeddedCoreAppWorker:
      env.DISABLE_EMBEDDED_CORE_APP_WORKER === '1' ||
      env.DISABLE_EMBEDDED_CORE_APP_WORKER === 'true',
    embeddedCoreAppToken: env.EMBEDDED_CORE_APP_TOKEN,
    initEventJobs:
      env.INIT_EVENT_JOBS === '1' || env.INIT_EVENT_JOBS === 'true',
  }
})
