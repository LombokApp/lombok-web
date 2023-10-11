/**
 * A subclass of Map<K, V> that lazy-instantiates requested entries.
 */
export class LazyMap<K, V> extends Map<K, V> {
  /**
   * Get an entry for a given key. The entry will be created with the provided
   * initializer callback if the entry does not yet exist.
   * @param key Entry key
   * @param init Entry initializer callback
   */
  get(key: K, init: () => V): V
  /**
   * Get an entry for a given key. This method returns undefined if the entry
   * does not exist.
   * @param key Entry key
   */
  get(key: K): V | undefined
  get(key: K, init?: () => V): V | undefined {
    if (init && !this.has(key)) {
      this.set(key, init())
    }

    return super.get.call(this, key)
  }
}

/**
 * A subclass of WeakMap<K, V> that lazy-instantiates requested entries.
 */
export class LazyWeakMap<K extends object, V> extends WeakMap<K, V> {
  /**
   * Get an entry for a given key. The entry will be created with the provided
   * initializer callback if the entry does not yet exist.
   * @param key Entry key
   * @param init Entry initializer callback
   */
  get(key: K, init: () => V): V
  /**
   * Get an entry for a given key. This method returns undefined if the entry
   * does not exist.
   * @param key Entry key
   */
  get(key: K): V | undefined
  // eslint-disable-next-line sonarjs/no-identical-functions
  get(key: K, init?: () => V): V | undefined {
    if (init && !this.has(key)) {
      this.set(key, init())
    }

    return super.get.call(this, key)
  }
}

export const arrayToChunks = <T, TA extends T[]>(
  array: TA,
  chunkSize: number,
): TA[] => {
  let i, j
  const acc: TA[] = []
  for (i = 0, j = array.length; i < j; i += chunkSize) {
    acc.push(array.slice(i, i + chunkSize) as TA)
  }
  return acc
}

export const range = (start: number, end: number) => {
  return Array(end - start + 1)
    .fill(null)
    .map((_, idx) => start + idx)
}

export const findAllByKey = <
  R = any,
  T extends { [key: string]: T } = { [key: string]: any },
>(
  obj: { [key: string]: any },
  keyToFind: string,
): R[] => {
  return Object.entries(obj).reduce<R[]>(
    (acc, [key, value]) =>
      key === keyToFind
        ? acc.concat(value as R[])
        : typeof value === 'object'
        ? acc.concat(findAllByKey<R, T>(value as object, keyToFind))
        : acc,
    [],
  )
}

export const filterNonUnique = (arr: any[]) =>
  arr.filter((i) => arr.indexOf(i) === arr.lastIndexOf(i))

export const removeDuplicates = (arr: any[]) => {
  return arr.filter((item, index) => arr.indexOf(item) === index)
}
