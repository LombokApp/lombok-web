import type z from 'zod'

export const minLength = (length: number) => (value: string) =>
  value.length >= length || `must be at lest ${length} chars`

export const isBoolean = (value: string) =>
  ['0', 'false', '1', 'true'].includes(value) || `${value} is not a boolean`

export const isInteger = (value: string) =>
  String(parseInt(value, 10)) === value || `${value} is not an integer`

/** Parses process.env with the given Zod object schema. */
export function parseEnv<T extends z.ZodType>(schema: T): z.output<T> {
  const result = schema.safeParse(process.env)
  if (result.success) {
    return result.data
  }
  throw new Error(`Environment config error: ${JSON.stringify(result.error)}`)
}
