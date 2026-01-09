import { NotFoundException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class ServerConfigurationNotFoundException extends NotFoundException {
  name = ServerConfigurationNotFoundException.name
  serviceErrorKey = ServiceErrorKey.ServerConfigurationNotFoundError
}
