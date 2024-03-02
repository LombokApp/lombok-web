import type * as r from 'runtypes'

export function parse<T>(type: r.Runtype<T>, data: unknown, defaultValue: T): T
export function parse<T>(type: r.Runtype<T>, data: unknown): T | undefined
export function parse(type: r.Runtype, data: unknown, defaultValue?: unknown) {
  if (type.guard(data)) {
    return data
  }

  return defaultValue
}
