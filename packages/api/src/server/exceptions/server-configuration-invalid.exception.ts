import { BadRequestException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class ServerConfigurationInvalidException extends BadRequestException {
  name = ServerConfigurationInvalidException.name
  serviceErrorKey = ServiceErrorKey.ServerConfigurationInvalid
}
