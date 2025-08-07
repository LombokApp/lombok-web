import { UnauthorizedException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/platform/constants/service-error-key.constants'

export class AccessTokenInvalidException extends UnauthorizedException {
  name = AccessTokenInvalidException.name
  serviceErrorKey: ServiceErrorKey

  constructor() {
    super()
    this.message = `Access token invalid.`
    this.serviceErrorKey = ServiceErrorKey.AccessTokenInvalid
  }
}
