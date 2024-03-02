import type express from 'express'
import { singleton } from 'tsyringe'

import { HttpStatusCode } from '../constants/http.constants'
import type { HealthIndicator } from './health-indicator'
import { HealthRegistry } from './health-registry'

@singleton()
export class HealthManager extends HealthRegistry implements HealthIndicator {
  healthy() {
    return this.healthState().ok
  }

  requestHandler() {
    return (req: express.Request, res: express.Response) => {
      const state = this.healthState()

      const status = state.ok
        ? HttpStatusCode.Ok
        : HttpStatusCode.ServiceUnavailable

      return res.status(status).json(state)
    }
  }
}
