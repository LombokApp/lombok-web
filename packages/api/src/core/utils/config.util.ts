import type { ZodType, ZodTypeDef } from 'zod'

export const minLength = (length: number) => (value: string) =>
  value.length >= length || `must be at lest ${length} chars`

export const isBoolean = (value: string) =>
  ['0', 'false', '1', 'true'].includes(value) || `${value} is not a boolean`

export const isInteger = (value: string) =>
  String(parseInt(value, 10)) === value || `${value} is not an integer`

/** Parses process.env with the given Zod object schema. */
export function parseEnv<T>(
  schema: ZodType<T, ZodTypeDef, Record<string, string | undefined>>,
): T {
  const result = schema.safeParse(process.env)
  if (result.success) {
    return result.data
  }
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  throw new Error(`Environment config error: ${result.error}`)
}
