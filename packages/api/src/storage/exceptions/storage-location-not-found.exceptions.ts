import { NotFoundException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/platform/constants/service-error-key.constants'

export class StorageLocationNotFoundException extends NotFoundException {
  name = StorageLocationNotFoundException.name
  serviceErrorKey = ServiceErrorKey.LocationNotFoundError
}
