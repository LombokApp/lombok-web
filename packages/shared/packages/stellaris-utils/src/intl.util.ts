import stringify from 'fast-json-stable-stringify'
import memoize from 'fast-memoize'

export const getNumberFormat = memoize(
  (...args: ConstructorParameters<typeof Intl.NumberFormat>) =>
    new Intl.NumberFormat(...args),
  {
    strategy: memoize.strategies.variadic,
    serializer: stringify,
  },
)

export const getDateTimeFormat = memoize(
  (...args: ConstructorParameters<typeof Intl.DateTimeFormat>) =>
    new Intl.DateTimeFormat(...args),
  {
    strategy: memoize.strategies.variadic,
    serializer: stringify,
  },
)
