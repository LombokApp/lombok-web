import { UnauthorizedException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/platform/constants/service-error-key.constants'

export class UserEmailNotVerifiedException extends UnauthorizedException {
  name = UserEmailNotVerifiedException.name
  code = ServiceErrorKey.UserEmailNotVerified
}
