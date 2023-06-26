import { ServiceErrorCode } from '../../../constants/error-code.constants'
import { HttpStatusCode } from '../../../constants/http.constants'
import { LogLevel } from '../../../constants/logging.constants'
import { HttpError } from '../../../errors/http.error'
import { Log } from '../../../errors/loggable.error'
import { formatErrorCode } from '../../../util/i18n.util'

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
