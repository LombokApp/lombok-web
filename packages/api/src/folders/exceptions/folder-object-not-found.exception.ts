import { NotFoundException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/platform/constants/service-error-key.constants'

export class FolderObjectNotFoundException extends NotFoundException {
  name = FolderObjectNotFoundException.name
  serviceErrorKey = ServiceErrorKey.FolderObjectNotFound
}
