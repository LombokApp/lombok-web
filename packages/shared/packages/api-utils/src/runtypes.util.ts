import * as r from 'runtypes'

export const EnumType = <T>(e: { [key: string]: T }): r.Runtype<T> => {
  const values: unknown[] = Object.values(e)

  return r.Unknown.withConstraint<T>(
    (v: unknown) =>
      values.includes(v) ||
      `Failed constraint check. Expected one of ${JSON.stringify(
        values,
      )}, but received ${JSON.stringify(v)}`,
  )
}

export function parseType<T>(
  type: r.Runtype<T>,
  data: unknown,
  defaultValue: T,
): T
export function parseType<T>(type: r.Runtype<T>, data: unknown): T | undefined
export function parseType(
  type: r.Runtype,
  data: unknown,
  defaultValue?: unknown,
) {
  if (type.guard(data)) {
    return data
  }

  return defaultValue
}
