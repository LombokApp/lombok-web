import { ServiceErrorCode } from '../../../constants/error-code.constants'
import { HttpStatusCode } from '../../../constants/http.constants'
import { LogLevel } from '../../../constants/logging.constants'
import { HttpError } from '../../../errors/http.error'
import { Log } from '../../../errors/loggable.error'
import { formatErrorCode } from '../../../util/i18n.util'

@Log(LogLevel.Debug, 'stack')
export class ApiKeyInvalidError extends Error implements HttpError {
  name = ApiKeyInvalidError.name;

  [HttpError.status] = HttpStatusCode.Unauthorized;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.AuthUnauthorized)]
}

@Log(LogLevel.Debug, 'stack')
export class ApiKeyRevokedError extends Error implements HttpError {
  name = ApiKeyInvalidError.name;

  [HttpError.status] = HttpStatusCode.Unauthorized;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.AuthUnauthorized)]
}

@Log(LogLevel.Debug, 'stack')
export class ApiKeyNotFoundError extends Error implements HttpError {
  name = ApiKeyNotFoundError.name;

  [HttpError.status] = HttpStatusCode.NotFound;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.ApiKeyNotFound)]
}
