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

export const parseSort = <T extends string, O extends string>(
  sort: Sort<T, O>,
) => {
  const [field, order] = splitSort(sort)
  return { [field]: order } as { [P in T]: O }
}
