import { UnauthorizedException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class LoginInvalidException extends UnauthorizedException {
  name = LoginInvalidException.name
  serviceErrorKey: ServiceErrorKey.LoginInvalid

  constructor() {
    super()
    this.message = `Login invalid.`
    this.serviceErrorKey = ServiceErrorKey.LoginInvalid
  }
}
