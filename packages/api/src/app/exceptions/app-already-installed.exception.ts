import { ConflictException } from '@nestjs/common'

export class AppAlreadyInstalledException extends ConflictException {
  name = AppAlreadyInstalledException.name
}
