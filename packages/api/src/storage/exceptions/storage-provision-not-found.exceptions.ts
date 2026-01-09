import { NotFoundException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class StorageProvisionNotFoundException extends NotFoundException {
  name = StorageProvisionNotFoundException.name
  serviceErrorKey = ServiceErrorKey.StorageProvisionNotFoundError
}
