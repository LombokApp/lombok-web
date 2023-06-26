import { ServiceErrorCode } from '../../../constants/error-code.constants'
import { HttpStatusCode } from '../../../constants/http.constants'
import { LogLevel } from '../../../constants/logging.constants'
import { HttpError } from '../../../errors/http.error'
import { Log } from '../../../errors/loggable.error'
import { formatErrorCode } from '../../../util/i18n.util'

@Log(LogLevel.Debug, 'stack')
export class FolderNotFoundError extends Error implements HttpError {
  name = FolderNotFoundError.name;

  [HttpError.status] = HttpStatusCode.NotFound;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.FolderNotFoundError)]
}

@Log(LogLevel.Debug, 'stack')
export class FolderInvalidError extends Error implements HttpError {
  name = FolderInvalidError.name;

  [HttpError.status] = HttpStatusCode.BadRequest;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.FolderInvalidError)]
}

@Log(LogLevel.Debug, 'stack')
export class FolderPermissionMissingError extends Error implements HttpError {
  name = FolderPermissionMissingError.name;

  [HttpError.status] = HttpStatusCode.Forbidden;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.FolderForbidden)]
}

@Log(LogLevel.Debug, 'stack')
export class FolderShareNotFoundError extends Error implements HttpError {
  name = FolderShareNotFoundError.name;

  [HttpError.status] = HttpStatusCode.NotFound;
  [HttpError.errors] = [
    formatErrorCode(ServiceErrorCode.FolderShareNotFoundError),
  ]
}

@Log(LogLevel.Debug, 'stack')
export class FolderObjectNotFoundError extends Error implements HttpError {
  name = FolderObjectNotFoundError.name;

  [HttpError.status] = HttpStatusCode.NotFound;
  [HttpError.errors] = [
    formatErrorCode(ServiceErrorCode.FolderObjectNotFoundError),
  ]
}

@Log(LogLevel.Debug, 'stack')
export class FolderPermissionInvalidError extends Error implements HttpError {
  name = FolderPermissionInvalidError.name;

  [HttpError.status] = HttpStatusCode.BadRequest;
  [HttpError.errors] = [
    formatErrorCode(ServiceErrorCode.FolderPermissionInvalid),
  ]
}

@Log(LogLevel.Debug, 'stack')
export class FolderTagNotFoundError extends Error implements HttpError {
  name = FolderTagNotFoundError.name;

  [HttpError.status] = HttpStatusCode.NotFound;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.FolderTagNotFound)]
}

@Log(LogLevel.Debug, 'stack')
export class FolderTagInvalidError extends Error implements HttpError {
  name = FolderTagInvalidError.name;

  [HttpError.status] = HttpStatusCode.NotFound;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.FolderTagInvalid)]
}

@Log(LogLevel.Debug, 'stack')
export class ObjectTagInvalidError extends Error implements HttpError {
  name = ObjectTagInvalidError.name;

  [HttpError.status] = HttpStatusCode.BadRequest;
  [HttpError.errors] = [formatErrorCode(ServiceErrorCode.ObjectTagInvalid)]
}
