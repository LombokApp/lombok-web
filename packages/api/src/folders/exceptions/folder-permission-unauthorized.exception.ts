import { UnauthorizedException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class FolderPermissionUnauthorizedException extends UnauthorizedException {
  name = FolderPermissionUnauthorizedException.name
  serviceErrorKey = ServiceErrorKey.FolderPermissionUnauthorized
}
