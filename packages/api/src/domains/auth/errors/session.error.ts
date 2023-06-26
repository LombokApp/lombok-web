import { ServiceErrorCode } from '../../../constants/error-code.constants'
import { HttpStatusCode } from '../../../constants/http.constants'
import { LogLevel } from '../../../constants/logging.constants'
import { HttpError } from '../../../errors/http.error'
import { Log } from '../../../errors/loggable.error'
import { formatErrorCode } from '../../../util/i18n.util'

@Log(LogLevel.Debug, 'stack')
export class SessionInvalidError extends Error implements HttpError {
  name = SessionInvalidError.name;

  [HttpError.status] = HttpStatusCode.Unauthorized;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.AuthUnauthorized)]
}

@Log(LogLevel.Debug, 'stack')
export class SessionRevokedError extends Error implements HttpError {
  name = SessionInvalidError.name;

  [HttpError.status] = HttpStatusCode.Unauthorized;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.AuthUnauthorized)]
}

@Log(LogLevel.Debug, 'expiredAt', 'stack')
export class SessionExpiredError extends Error implements HttpError {
  name = SessionExpiredError.name;

  [HttpError.status] = HttpStatusCode.Unauthorized;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.AuthExpired)]

  constructor(readonly expiredAt: Date) {
    super()
    this.expiredAt = expiredAt
  }
}

@Log(LogLevel.Debug, 'stack')
export class SessionNotFoundError extends Error implements HttpError {
  name = SessionNotFoundError.name;

  [HttpError.status] = HttpStatusCode.NotFound;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.SessionNotFound)]
}
