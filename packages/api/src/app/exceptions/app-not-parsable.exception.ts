import { ConflictException } from '@nestjs/common'

export class AppNotParsableException extends ConflictException {
  name = AppNotParsableException.name
}
