import type { NextFunction, Request, Response } from 'express'

import { AuthorizationHeaderInvalidError } from '../errors/auth.error'
import { HttpError } from '../errors/http.error'
import type { LoggingService } from '../services/logging.service'

export const httpErrorMiddleware = (loggingService: LoggingService) => {
  return (error: unknown, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof AuthorizationHeaderInvalidError) {
      res.set('WWW-Authenticate', error.scheme)
    }

    const result = HttpError.parse(error)

    if (result.success) {
      return res.error(result.value)
    } else {
      loggingService.logger.debug(result)
    }

    next(error)
  }
}
