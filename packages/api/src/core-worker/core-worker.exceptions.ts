import type { JsonSerializableObject } from '@lombokapp/types'

export class CoreWorkerError extends Error {}

export class CoreWorkerErrorWrappper extends CoreWorkerError {
  public readonly innerError: JsonSerializableObject | Error
  constructor(
    readonly code: string,
    message: string,
    detailsOrError: JsonSerializableObject | Error,
  ) {
    super(message)
    this.innerError = detailsOrError
  }
}
