import { NotFoundException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class FolderObjectNotFoundException extends NotFoundException {
  name = FolderObjectNotFoundException.name
  serviceErrorKey = ServiceErrorKey.FolderObjectNotFound
}
