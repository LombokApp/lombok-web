import { ServiceUnavailableException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class EmailNotConfiguredException extends ServiceUnavailableException {
  name = EmailNotConfiguredException.name
  serviceErrorKey = ServiceErrorKey.EmailNotConfigured
}
