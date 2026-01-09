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
