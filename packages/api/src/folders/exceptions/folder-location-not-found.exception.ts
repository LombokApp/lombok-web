import { NotFoundException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class FolderLocationNotFoundException extends NotFoundException {
  name = FolderLocationNotFoundException.name
  serviceErrorKey = ServiceErrorKey.FolderLocationNotFound
}
