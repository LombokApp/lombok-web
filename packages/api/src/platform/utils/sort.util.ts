import { asc, desc } from 'drizzle-orm'
import type { PgTableWithColumns } from 'drizzle-orm/pg-core'

import { InvalidSortColumnException } from '../exceptions/invalid-sort-column.exception'

export type Sort<T extends string, O extends string = 'asc' | 'desc'> =
  | `${T}-${O}`
  | undefined

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SortField<T> = T extends Sort<infer U, any> ? U : never
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SortDir<T> = T extends Sort<any, infer U> ? U : never

/**
 * Normalizes a sort parameter that can be a single value, array of values, or undefined.
 * Returns either an array of values or undefined.
 */
export const normalizeSortParam = <T>(
  sort: T | T[] | undefined,
): T[] | undefined => {
  if (Array.isArray(sort)) {
    return sort
  }
  if (sort !== undefined) {
    return [sort]
  }
  return undefined
}

export const splitSort = <T extends string, O extends string>(
  sort: Sort<T, O>,
) => {
  return (sort?.split('-') ?? []) as [T, O]
}

export const parseSort = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TA extends PgTableWithColumns<any>,
  T extends string = string,
  O extends string = string,
>(
  table: TA,
  sorts: Sort<T, O>[],
) => {
  return sorts.map((sort) => {
    const [column, order] = splitSort(sort)
    if (!(column in table)) {
      throw new InvalidSortColumnException(column)
    }
    return (order === 'asc' ? asc : desc)(table[column])
  })
}
