import { UnauthorizedException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class FolderMetadataWriteUnauthorisedException extends UnauthorizedException {
  name = FolderMetadataWriteUnauthorisedException.name
  serviceErrorKey = ServiceErrorKey.FolderMetadataWriteUnauthorized
}
