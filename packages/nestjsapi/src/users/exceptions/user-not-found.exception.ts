import { NotFoundException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class UserNotFoundException extends NotFoundException {
  name = UserNotFoundException.name
  code = ServiceErrorKey.UserNotFound
}
