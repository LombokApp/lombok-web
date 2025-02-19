import { registerAs } from '@nestjs/config'
import * as r from 'runtypes'

import { isBoolean, parseEnv } from '../utils/config.util'

export const coreConfig = registerAs('core', () => {
  const env = parseEnv({
    INSTALL_APPS_ON_START: r.String.withConstraint(isBoolean).optional(),
    APP_HOST_ID: r.String,
    INITIAL_USER: r.String.optional(),
    DISABLE_EMBEDDED_CORE_APP_WORKER:
      r.String.withConstraint(isBoolean).optional(),
    INIT_EVENT_JOBS: r.String.withConstraint(isBoolean).optional(),
    EMBEDDED_CORE_APP_TOKEN: r.String.optional(),
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
