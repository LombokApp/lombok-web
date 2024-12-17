import { ConflictException } from '@nestjs/common'

export class AppRequirementsNotSatisfiedException extends ConflictException {
  name = AppRequirementsNotSatisfiedException.name
}
