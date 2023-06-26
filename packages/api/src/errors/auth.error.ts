import { ServiceErrorCode } from '../constants/error-code.constants'
import { HttpStatusCode } from '../constants/http.constants'
import { LogLevel } from '../constants/logging.constants'
import { formatErrorCode } from '../util/i18n.util'
import { HttpError } from './http.error'
import { Log } from './loggable.error'

export class UnauthorizedError extends Error implements HttpError {
  name = UnauthorizedError.name;

  [HttpError.status] = HttpStatusCode.Unauthorized;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.AuthUnauthorized)]
}

@Log(LogLevel.Debug, 'header', 'stack')
export class AuthorizationHeaderInvalidError
  extends Error
  implements HttpError
{
  name = AuthorizationHeaderInvalidError.name;

  [HttpError.status] = HttpStatusCode.Unauthorized;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.AuthUnauthorized)]

  constructor(
    readonly header: string,
    readonly scheme: 'bearer' | 'basic' | 'api-key',
  ) {
    super()
  }
}

@Log(LogLevel.Debug, 'query', 'stack')
export class SessionAuthInvalidError extends Error implements HttpError {
  name = SessionAuthInvalidError.name;

  [HttpError.status] = HttpStatusCode.Unauthorized;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.AuthUnauthorized)]

  constructor(readonly query?: any) {
    super()
  }
}

@Log(LogLevel.Verbose, 'required', 'provided')
export class ScopeRequiredError extends Error implements HttpError {
  name = ScopeRequiredError.name;

  [HttpError.status] = HttpStatusCode.Forbidden;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.AuthForbidden)]

  constructor(readonly required: string[], readonly provided: string[]) {
    super()
  }
}
