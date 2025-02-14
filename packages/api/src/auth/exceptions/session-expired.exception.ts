import { UnauthorizedException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class SessionExpiredException extends UnauthorizedException {
  name = SessionExpiredException.name
  serviceErrorKey: ServiceErrorKey

  constructor() {
    super()
    this.message = `Session expired.`
    this.serviceErrorKey = ServiceErrorKey.SessionExpired
  }
}
