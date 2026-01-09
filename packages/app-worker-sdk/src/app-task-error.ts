import type { JsonSerializableObject } from '@lombokapp/types'

export class AppTaskError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly details: JsonSerializableObject = {},
    public readonly requeueDelayMs?: number,
    public readonly cause?: AppTaskError,
  ) {
    super(message)
  }
}
