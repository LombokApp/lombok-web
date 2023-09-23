import util from 'util'
import type { LogEntry } from 'winston'

import type { LogLevel } from '../constants/logging.constants'

const _level = Symbol('level')
const _include = Symbol('include')

export function Log(
  level: LogLevel,
  ...propertyKeys: (string | symbol)[]
): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(
      _level,
      level,
      target.prototype as NonNullable<unknown>,
    )
    Reflect.defineMetadata(
      _include,
      propertyKeys,
      target.prototype as NonNullable<unknown>,
    )
    return target
  }
}

export const parsedErrors = new WeakMap<
  NonNullable<unknown>,
  LogEntry | undefined
>()

export const parseLoggableError = (error: unknown) => {
  if (parsedErrors.has(error as NonNullable<unknown>)) {
    return parsedErrors.get(error as NonNullable<unknown>)
  }

  if (error instanceof Error && Reflect.hasMetadata(_level, error)) {
    const level = Reflect.getMetadata(_level, error) as LogLevel
    const log = Reflect.getMetadata(_include, error) as
      | (string | symbol)[]
      | undefined

    const entry: LogEntry = {
      level,
      message: error.message || error.name || '(no error message)',
      stack: error.stack,
    }

    if (log && log.length > 0) {
      const meta: Record<string, any> = {}

      log.forEach((propertyKey) => {
        meta[String(propertyKey)] = (error as never)[propertyKey]
      })

      Object.assign(entry, meta)

      entry.message += ' ' + util.inspect(meta, { colors: true })
    }

    parsedErrors.set(error, entry)

    return entry
  }

  try {
    parsedErrors.set(error as NonNullable<unknown>, undefined)
  } catch {
    // Ignore 'Invalid value used in weak set' error
  }
}

export const isLoggableError = (error: any) => !!parseLoggableError(error)
