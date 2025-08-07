import { NotFoundException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/platform/constants/service-error-key.constants'

export class FolderLocationNotFoundException extends NotFoundException {
  name = FolderLocationNotFoundException.name
  serviceErrorKey = ServiceErrorKey.FolderLocationNotFound
}
