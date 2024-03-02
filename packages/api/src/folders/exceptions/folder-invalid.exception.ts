import { BadRequestException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class FolderInvalidException extends BadRequestException {
  name = FolderInvalidException.name
  serviceErrorKey = ServiceErrorKey.FolderInvalid
}
