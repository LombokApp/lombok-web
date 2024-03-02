import type { NextFunction, Request, Response } from 'express'

import { InternalServerError } from '../errors/app.error'
import type { LoggingService } from '../services/logging.service'

export const unhandledErrorMiddleware = (loggingService: LoggingService) => {
  return (error: unknown, req: Request, res: Response, _next: NextFunction) => {
    loggingService.handleError(error)

    // eslint-disable-next-line no-console
    console.error(error)

    return res.error(new InternalServerError(error, res.sentry))
  }
}
