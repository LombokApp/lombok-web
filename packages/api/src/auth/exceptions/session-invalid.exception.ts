import { ForbiddenException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class SessionInvalidException extends ForbiddenException {
  name = SessionInvalidException.name
  serviceErrorKey: ServiceErrorKey

  constructor() {
    super()
    this.message = `Session invalid.`
    this.serviceErrorKey = ServiceErrorKey.SessionInvalid
  }
}
