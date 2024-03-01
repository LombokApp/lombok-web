import { NotFoundException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class FolderNotFoundException extends NotFoundException {
  name = FolderNotFoundException.name
  serviceErrorKey = ServiceErrorKey.FolderNotFound
}
