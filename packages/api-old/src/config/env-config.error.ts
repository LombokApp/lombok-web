import type { Failure } from 'runtypes'

export class EnvConfigError extends Error {
  constructor(result: Failure) {
    const message =
      result.details === undefined
        ? undefined
        : typeof result.details === 'string'
        ? result.details
        : Object.entries(result.details)
            .map(([key, value]) => `${key}: ${value as string}`)
            .join('; ')

    super(message)
  }
}
