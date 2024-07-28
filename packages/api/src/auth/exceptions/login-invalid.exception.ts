import { UnauthorizedException } from '@nestjs/common'
import type { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class LoginInvalidException extends UnauthorizedException {
  name = LoginInvalidException.name
  serviceErrorKey: ServiceErrorKey.LoginInvalid
}
