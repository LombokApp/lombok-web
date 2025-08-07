import { UnauthorizedException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/platform/constants/service-error-key.constants'

export class SessionNotFoundException extends UnauthorizedException {
  name = SessionNotFoundException.name
  serviceErrorKey: ServiceErrorKey

  constructor() {
    super()
    this.message = `Session not found.`
    this.serviceErrorKey = ServiceErrorKey.SessionNotFound
  }
}
