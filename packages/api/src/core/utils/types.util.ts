import * as r from 'runtypes'
import type { MutableKeys } from 'utility-types'

/**
 * Create a new parial type containing only the mutable fields from `T`.
 *
 * @example
 *   type Props = { readonly foo: string; bar: number };
 *
 *   // Expect: { bar?: number | undefined }
 *   type Writable = PartialWritable<Props>;
 *
 * @ignore
 */
export type PartialWritable<T extends object> = {
  [K in keyof T as MutableKeys<T>]?: T[K]
}

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

// propertyOf enforces that the string value representation of property
// of type T is an actual property of T.
export const propertyOf = <T>(propertyName: string & keyof T): string => {
  return propertyName
}

export type ShapeOf<T> = Record<keyof T, unknown>

export type AssertKeysEqual<X extends ShapeOf<Y>, Y extends ShapeOf<X>> = never

export type Concrete<Type> = {
  [Property in keyof Type]-?: Type[Property]
}
