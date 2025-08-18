import { NotFoundException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/platform/constants/service-error-key.constants'

export class StorageProvisionNotFoundException extends NotFoundException {
  name = StorageProvisionNotFoundException.name
  serviceErrorKey = ServiceErrorKey.StorageProvisionNotFoundError
}
