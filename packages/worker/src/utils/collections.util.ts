export const uniqueByReduce = <T>(array: T[]): T[] => {
  return array.reduce((acc: T[], cur: T) => {
    if (!acc.includes(cur)) {
      acc.push(cur)
    }
    return acc
  }, [])
}
