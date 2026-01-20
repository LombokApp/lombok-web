import z from 'zod'

export type JsonSerializablePrimitive = string | number | boolean | null

export type JsonSerializableValue =
  | JsonSerializablePrimitive
  | JsonSerializableValue[]
  | { [key: string]: JsonSerializableValue }

export const jsonSerializableValueSchema: z.ZodType<JsonSerializableValue> =
  z.lazy(() =>
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(jsonSerializableValueSchema),
      z.record(jsonSerializableValueSchema),
    ]),
  )

export const jsonSerializableObjectSchema = z.record(
  z.string(),
  jsonSerializableValueSchema,
)

export const jsonSerializableObjectWithUndefinedSchema = z.record(
  z.string(),
  jsonSerializableValueSchema.or(z.undefined()),
)

export type JsonSerializableObject = z.infer<
  typeof jsonSerializableObjectSchema
>

export type JsonConversionMode = 'strict' | 'recursive'

const convertUnknownToJsonSerializableValueRecursive = (
  value: unknown,
): JsonSerializableValue | undefined => {
  // Handle null
  if (value === null) {
    return null
  }

  // Handle primitives
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const result: JsonSerializableValue[] = []
    for (const item of value) {
      const converted = convertUnknownToJsonSerializableValueRecursive(item)
      if (converted !== undefined) {
        result.push(converted)
      }
    }
    return result
  }

  // Handle objects
  if (typeof value === 'object') {
    const result: Record<string, JsonSerializableValue> = {}
    for (const [key, val] of Object.entries(value)) {
      // Only include string keys
      if (typeof key === 'string') {
        const converted = convertUnknownToJsonSerializableValueRecursive(val)
        if (converted !== undefined) {
          result[key] = converted
        }
      }
    }
    return result
  }

  // For other types (undefined, functions, symbols, etc.), return undefined to omit
  return undefined
}

export function convertUnknownToJsonSerializableValue<
  T extends boolean = false,
  R = T extends false
    ? JsonSerializableValue | undefined
    : JsonSerializableValue,
>(
  value: unknown,
  {
    mode = 'strict',
    throwErrors = true as T,
  }: {
    mode?: JsonConversionMode
    throwErrors?: T
  } = {
    mode: 'strict',
    throwErrors: true as T,
  },
): R {
  if (mode === 'strict') {
    // Attempt to serialize and deserialize the whole value
    try {
      const serialized = JSON.stringify(value)
      const deserialized: unknown = JSON.parse(serialized)
      // Validate it matches the schema
      const validated = jsonSerializableValueSchema.parse(deserialized)
      return validated as R
    } catch (error) {
      if (throwErrors) {
        throw new Error(
          `Failed to convert value to JsonSerializableValue in strict mode: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
      return undefined as R
    }
  } else {
    // Recursive mode: process properties individually
    const result = convertUnknownToJsonSerializableValueRecursive(value)
    if (result === undefined && throwErrors) {
      throw new Error(
        'Failed to convert value to JsonSerializableValue: value could not be converted',
      )
    }
    return result as R
  }
}

export function convertUnknownToJsonSerializableObject<
  T extends boolean = false,
  R = T extends false
    ? JsonSerializableObject | undefined
    : JsonSerializableObject,
>(
  value: unknown,
  {
    mode = 'strict',
    throwErrors = true as T,
  }: { mode?: JsonConversionMode; throwErrors?: T } = {
    mode: 'strict',
    throwErrors: true as T,
  },
): R {
  const converted = convertUnknownToJsonSerializableValue(value, {
    mode,
    throwErrors,
  })

  const validation = jsonSerializableObjectSchema.safeParse(converted)
  if (!validation.success) {
    if (!throwErrors) {
      return undefined as R
    }
    throw new Error('Value must be a valid JsonSerializableObject')
  }

  return validation.data as R
}
