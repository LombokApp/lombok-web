import { ServiceErrorCode } from '../../../constants/error-code.constants'
import { HttpStatusCode } from '../../../constants/http.constants'
import { LogLevel } from '../../../constants/logging.constants'
import { HttpError } from '../../../errors/http.error'
import { Log } from '../../../errors/loggable.error'
import { formatErrorCode } from '../../../util/i18n.util'

@Log(LogLevel.Debug, 'stack')
export class S3ConnectionNotFoundError extends Error implements HttpError {
  name = S3ConnectionNotFoundError.name;

  [HttpError.status] = HttpStatusCode.NotFound;
  [HttpError.errors] = [
    formatErrorCode(ServiceErrorCode.S3ConnectionNotFoundError),
  ]
}

@Log(LogLevel.Debug, 'stack')
export class S3ConnectionInvalidError extends Error implements HttpError {
  name = S3ConnectionInvalidError.name;

  [HttpError.status] = HttpStatusCode.BadRequest;
  [HttpError.errors] = [
    formatErrorCode(ServiceErrorCode.S3ConnectionInvalidError),
  ]
}
