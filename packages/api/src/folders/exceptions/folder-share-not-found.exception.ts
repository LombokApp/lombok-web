import { NotFoundException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/platform/constants/service-error-key.constants'

export class FolderShareNotFoundException extends NotFoundException {
  name = FolderShareNotFoundException.name
  serviceErrorKey = ServiceErrorKey.FolderShareNotFound
}
