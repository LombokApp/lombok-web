import { asc, desc } from 'drizzle-orm'
import type { PgTableWithColumns } from 'drizzle-orm/pg-core'

import { InvalidSortColumnException } from '../exceptions/invalid-sort-column.exception'

export type Sort<T extends string, O extends string = 'asc' | 'desc'> =
  | `${T}-${O}`
  | undefined

export type SortField<T> = T extends Sort<infer U, any> ? U : never
export type SortDir<T> = T extends Sort<any, infer U> ? U : never

export const splitSort = <T extends string, O extends string>(
  sort: Sort<T, O>,
) => {
  return (sort?.split('-') ?? []) as [T, O]
}

export const parseSort = <
  TA extends PgTableWithColumns<any>,
  T extends string = string,
  O extends string = string,
>(
  table: TA,
  sort: Sort<T, O>,
) => {
  const [column, order] = splitSort(sort)
  if (!(column in table)) {
    throw new InvalidSortColumnException(column)
  }
  return (order === 'asc' ? asc : desc)(table[column])
}
