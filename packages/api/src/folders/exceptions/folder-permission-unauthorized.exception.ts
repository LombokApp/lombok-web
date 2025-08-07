import { UnauthorizedException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/platform/constants/service-error-key.constants'

export class FolderPermissionUnauthorizedException extends UnauthorizedException {
  name = FolderPermissionUnauthorizedException.name
  serviceErrorKey = ServiceErrorKey.FolderPermissionUnauthorized
}
