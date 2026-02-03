import { BadGatewayException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class EmailSendFailedException extends BadGatewayException {
  name = EmailSendFailedException.name
  serviceErrorKey = ServiceErrorKey.EmailSendFailed
}
