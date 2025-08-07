import { UnauthorizedException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/platform/constants/service-error-key.constants'

export class SessionInvalidException extends UnauthorizedException {
  name = SessionInvalidException.name
  serviceErrorKey: ServiceErrorKey

  constructor() {
    super()
    this.message = `Session invalid.`
    this.serviceErrorKey = ServiceErrorKey.SessionInvalid
  }
}
