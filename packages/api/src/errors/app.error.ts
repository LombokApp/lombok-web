import { ServiceErrorCode } from '../constants/error-code.constants'
import { HttpStatusCode } from '../constants/http.constants'
import { LogLevel } from '../constants/logging.constants'
import { formatErrorCode } from '../util/i18n.util'
import { HttpError } from './http.error'
import { Log } from './loggable.error'

@Log(LogLevel.Debug)
export class RouteNotFoundError extends Error implements HttpError {
  name = RouteNotFoundError.name;

  [HttpError.status] = HttpStatusCode.NotFound;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.AppNotFound)]
}

@Log(LogLevel.Error, 'initial', 'id')
export class InternalServerError extends Error implements HttpError {
  name = InternalServerError.name;

  [HttpError.status] = HttpStatusCode.InternalServerError;
  [HttpError.errors] = [
    { id: this.id, ...formatErrorCode(ServiceErrorCode.AppInternalError) },
  ]

  constructor(readonly initial: unknown, readonly id?: string) {
    super()
  }
}
