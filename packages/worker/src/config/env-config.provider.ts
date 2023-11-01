import * as r from 'runtypes'
import type { RuntypeBase } from 'runtypes/lib/runtype'

import type { ConfigProvider, ServiceAuthConfig } from './config.interface'
import { EnvConfigError } from './env-config.error'

const parseEnv = <T extends Record<string, RuntypeBase>>(fields: T) => {
  const result = r.Record(fields).validate(process.env)

  if (result.success) {
    return result.value
  }

  throw new EnvConfigError(
    result as {
      success: false
      code: r.Failcode
      message: string
      details?: r.Details | undefined
    },
  )
}

export class EnvConfigProvider implements ConfigProvider {
  private serviceAuth?: ServiceAuthConfig

  getServiceAuthConfig() {
    if (!this.serviceAuth) {
      const env = parseEnv({
        WORKER_TOKEN: r.String,
        API_BASE_URL: r.String,
        SOCKET_BASE_URL: r.String,
        WORKER_UNIQUE_NAME: r.String,
      })

      this.serviceAuth = {
        workerToken: env.WORKER_TOKEN,
        apiBaseUrl: env.API_BASE_URL,
        socketBaseUrl: env.SOCKET_BASE_URL,
        workerUniqueName: env.WORKER_UNIQUE_NAME,
      }
    }

    return this.serviceAuth
  }
}
