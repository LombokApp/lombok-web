import { ForbiddenException } from '@nestjs/common'

export class SearchWorkerUnauthorizedException extends ForbiddenException {
  constructor(workerIdentifier: string, appIdentifier: string) {
    super(
      `Worker '${workerIdentifier}' in app '${appIdentifier}' is not authorized for search operations`,
    )
  }
}
