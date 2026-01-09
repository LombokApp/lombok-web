import { BadRequestException } from '@nestjs/common'

import { ServiceErrorKey } from '../../core/constants/service-error-key.constants'

export class InvalidSortColumnException extends BadRequestException {
  name = InvalidSortColumnException.name
  serviceErrorKey: ServiceErrorKey

  constructor(readonly columnName: string) {
    super()
    this.message = `Invalid sort column "${columnName}".`
    this.serviceErrorKey = ServiceErrorKey.InvalidSortColumn
  }
}
