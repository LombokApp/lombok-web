import type { JsonSerializableObject, RequeueConfig } from '@lombokapp/types'

export class AppTaskError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly details: JsonSerializableObject = {},
    public readonly requeue?: RequeueConfig,
    public readonly cause?: AppTaskError,
  ) {
    super(message)
  }
}
