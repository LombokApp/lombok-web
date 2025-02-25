import type { ZodSchema } from 'zod'
import { z } from 'zod'

export const minLength = (length: number) => (value: string) =>
  value.length >= length || `must be at lest ${length} chars`

export const isBoolean = (value: string) =>
  ['0', 'false', '1', 'true'].includes(value) || `${value} is not a boolean`

export const isInteger = (value: string) =>
  String(parseInt(value, 10)) === value || `${value} is not an integer`

export const parseEnv = <T extends Record<string, ZodSchema>>(fields: T) => {
  const schema = z.object(fields)
  const result = schema.safeParse(process.env)

  if (result.success) {
    return result.data
  }

  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  throw new Error(`Environment config error: ${result.error}`)
}
