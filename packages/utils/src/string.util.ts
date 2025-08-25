export const capitalize = <T extends string>(str: T) =>
  (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>
