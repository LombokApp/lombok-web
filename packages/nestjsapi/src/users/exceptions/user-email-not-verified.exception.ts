import { UnauthorizedException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class UserEmailNotVerifiedException extends UnauthorizedException {
  name = UserEmailNotVerifiedException.name
  code = ServiceErrorKey.UserEmailNotVerified
}
