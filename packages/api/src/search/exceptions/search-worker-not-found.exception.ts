import { NotFoundException } from '@nestjs/common'

export class SearchWorkerNotFoundException extends NotFoundException {
  constructor(workerIdentifier: string, appIdentifier: string) {
    super(
      `Search worker '${workerIdentifier}' not found in app '${appIdentifier}'`,
    )
  }
}
