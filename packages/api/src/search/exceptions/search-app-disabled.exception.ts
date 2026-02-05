import { ServiceUnavailableException } from '@nestjs/common'

export class SearchAppDisabledException extends ServiceUnavailableException {
  constructor(appIdentifier: string) {
    super(`Search app '${appIdentifier}' is currently disabled`)
  }
}
