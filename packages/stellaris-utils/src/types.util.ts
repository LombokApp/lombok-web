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

// propertyOf enforces that the string value representation of property
// of type T is an actual property of T.
export const propertyOf = <T>(propertyName: string & keyof T): string => {
  return propertyName
}

export type ShapeOf<T> = Record<keyof T, unknown>

// eslint-disable-next-line no-use-before-define
export type AssertKeysEqual<X extends ShapeOf<Y>, Y extends ShapeOf<X>> = never

export type Concrete<Type> = {
  [Property in keyof Type]-?: Type[Property]
}

export type NullablePartial<
  T,
  NK extends keyof T = {
    [K in keyof T]: null extends T[K] ? K : never
  }[keyof T],
  NP = Partial<Pick<T, NK>> & Pick<T, Exclude<keyof T, NK>>,
> = { [K in keyof NP]: NP[K] }
