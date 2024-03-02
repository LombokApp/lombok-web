import type { Failure } from 'runtypes'
import * as r from 'runtypes'
import type { RuntypeBase } from 'runtypes/lib/runtype'

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

export const parseEnv = <T extends Record<string, RuntypeBase>>(fields: T) => {
  const result = r.Record(fields).validate(process.env)

  if (result.success) {
    return result.value
  }

  throw new EnvConfigError(
    result as {
      success: false
      code: r.Failcode
      message: string
      details?: r.Details | undefined
    },
  )
}

export const minLength = (length: number) => (value: string) =>
  value.length >= length || `must be at lest ${length} chars`

export const isBoolean = (value: string) =>
  ['0', 'false', '1', 'true'].includes(value) || `${value} is not a boolean`

export const isInteger = (value: string) =>
  String(parseInt(value, 10)) === value || `${value} is not an integer`
