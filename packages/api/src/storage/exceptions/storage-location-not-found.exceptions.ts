import { NotFoundException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class StorageLocationNotFoundException extends NotFoundException {
  name = StorageLocationNotFoundException.name
  serviceErrorKey = ServiceErrorKey.LocationNotFoundError
}
