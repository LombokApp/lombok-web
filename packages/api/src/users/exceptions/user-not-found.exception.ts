import { NotFoundException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/platform/constants/service-error-key.constants'

export class UserNotFoundException extends NotFoundException {
  name = UserNotFoundException.name
  code = ServiceErrorKey.UserNotFound
}
