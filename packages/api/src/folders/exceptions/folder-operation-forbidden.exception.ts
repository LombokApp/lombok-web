import { ForbiddenException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class FolderOperationForbiddenException extends ForbiddenException {
  name = FolderOperationForbiddenException.name
  serviceErrorKey = ServiceErrorKey.FolderPermissionUnauthorized
}
