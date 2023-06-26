import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import { Failure } from 'runtypes'

import { ServiceErrorCode } from '../../../constants/error-code.constants'
import { HttpStatusCode } from '../../../constants/http.constants'
import { LogLevel } from '../../../constants/logging.constants'
import { HttpError } from '../../../errors/http.error'
import { Log } from '../../../errors/loggable.error'
import { formatErrorCode } from '../../../util/i18n.util'

@Log(LogLevel.Debug, 'inner', 'token', 'stack')
export class AuthTokenInvalidError extends Error implements HttpError {
  name = AuthTokenInvalidError.name;

  [HttpError.status] = HttpStatusCode.Unauthorized;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.AuthUnauthorized)]

  readonly inner

  constructor(readonly token: string, error?: JsonWebTokenError) {
    super()
    this.inner = error?.inner
  }
}

@Log(LogLevel.Debug, 'inner', 'expiredAt', 'stack')
export class AuthTokenExpiredError extends Error implements HttpError {
  name = AuthTokenExpiredError.name;

  [HttpError.status] = HttpStatusCode.Unauthorized;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.AuthExpired)]

  readonly inner
  readonly expiredAt

  constructor(readonly token: string, error: TokenExpiredError) {
    super()
    this.inner = error.inner
    this.expiredAt = error.expiredAt
  }
}

@Log(LogLevel.Warn, 'token', 'failureCode', 'details')
export class AuthTokenParseError extends Error implements HttpError {
  name = AuthTokenParseError.name;

  [HttpError.status] = HttpStatusCode.Unauthorized;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.AuthUnauthorized)]

  readonly failureCode
  readonly details

  constructor(readonly token: any, failure: Failure) {
    super()
    this.failureCode = failure.code
    this.details = failure.details
  }
}
