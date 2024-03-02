import { NotFoundException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class LocationNotFoundException extends NotFoundException {
  name = LocationNotFoundException.name
  serviceErrorKey = ServiceErrorKey.LocationNotFoundError
}
