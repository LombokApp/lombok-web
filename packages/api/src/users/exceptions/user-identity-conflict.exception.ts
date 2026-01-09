import { ConflictException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class UserIdentityConflictException extends ConflictException {
  name = UserIdentityConflictException.name
  code = ServiceErrorKey.UserIdentityConflict
}
