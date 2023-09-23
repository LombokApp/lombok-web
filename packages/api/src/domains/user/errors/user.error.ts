import { ServiceErrorCode } from '../../../constants/error-code.constants'
import { HttpStatusCode } from '../../../constants/http.constants'
import { LogLevel } from '../../../constants/logging.constants'
import { HttpError } from '../../../errors/http.error'
import { Log } from '../../../errors/loggable.error'
import { formatErrorCode } from '../../../util/i18n.util'

@Log(LogLevel.Verbose, 'code', 'username')
export class LoginInvalidError extends Error implements HttpError {
  name = LoginInvalidError.name
  code = ServiceErrorCode.LoginInvalid;

  [HttpError.status] = HttpStatusCode.Unauthorized;
  [HttpError.errors] = [formatErrorCode(this.code)]

  constructor(readonly username: string) {
    super()
  }
}

@Log(LogLevel.Verbose, 'code', 'email')
export class UserIdentityConflictError extends Error implements HttpError {
  name = UserIdentityConflictError.name
  code = ServiceErrorCode.UserIdentityConflict;

  [HttpError.status] = HttpStatusCode.Conflict;
  [HttpError.errors] = [formatErrorCode(this.code, { email: this.email })]

  constructor(readonly email: string) {
    super()
  }
}

@Log(LogLevel.Verbose, 'stack')
export class LogoutInvalidError extends Error implements HttpError {
  name = LogoutInvalidError.name;

  [HttpError.status] = HttpStatusCode.Unauthorized;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.AuthUnauthorized)]
}

@Log(LogLevel.Debug, 'stack')
export class UserNotFoundError extends Error implements HttpError {
  name = UserNotFoundError.name;

  [HttpError.status] = HttpStatusCode.NotFound;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.UserNotFound)]
}

@Log(LogLevel.Debug, 'stack')
export class UserEmailNotVerifiedError extends Error implements HttpError {
  name = UserEmailNotVerifiedError.name;

  [HttpError.status] = HttpStatusCode.Unauthorized;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.UserEmailNotVerified)]
}
