import type { z } from 'zod'

export function safeZodParse<T extends z.ZodType>(
  input: unknown,
  zodType: T,
): input is z.infer<T> {
  const result = zodType.safeParse(input)
  return result.success
}

export type Variant<S extends z.ZodTypeAny, K extends string, V> = Extract<
  z.infer<S>,
  Record<K, V>
>
