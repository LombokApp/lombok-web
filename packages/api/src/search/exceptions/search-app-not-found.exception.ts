import { NotFoundException } from '@nestjs/common'

export class SearchAppNotFoundException extends NotFoundException {
  constructor(appIdentifier: string) {
    super(`Search app '${appIdentifier}' not found or has been uninstalled`)
  }
}
