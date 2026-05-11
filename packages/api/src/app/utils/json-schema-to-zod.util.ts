import type {
  JsonSchema07DiscriminatedObjectItem,
  JsonSchema07Object,
  JsonSchema07ObjectItem,
  JsonSchema07ObjectItemProperty,
  JsonSchema07PrimitiveProperty,
  JsonSchema07Property,
} from '@lombokapp/types'
import { z } from 'zod'

/**
 * Resolve a primitive property's `type` value to its base literal and a
 * `nullable` flag. Accepts both the canonical literal (`"string"`) and the
 * JSON-Schema tuple form (`["string", "null"]`) used to express nullable
 * primitives. All primitive cases (string / number / integer / boolean)
 * support both forms.
 */
function unpackPrimitiveType(t: JsonSchema07PrimitiveProperty['type']): {
  base: 'string' | 'number' | 'integer' | 'boolean'
  nullable: boolean
} {
  if (Array.isArray(t)) {
    // Tuple form is `[<primitive>, "null"]` — the second slot is constrained
    // to the literal `"null"` by the upstream Zod schema, so reaching here
    // means the property is nullable.
    return { base: t[0], nullable: true }
  }
  return { base: t, nullable: false }
}

function primitivePropertyToZod(
  prop: JsonSchema07PrimitiveProperty,
): z.ZodType {
  const { base, nullable } = unpackPrimitiveType(prop.type)
  let schema: z.ZodType
  switch (base) {
    case 'string': {
      const stringProp = prop as Extract<
        JsonSchema07PrimitiveProperty,
        { type: 'string' | ['string', 'null'] }
      >
      if (stringProp.enum) {
        schema =
          stringProp.enum.length > 0
            ? z.enum(stringProp.enum as [string, ...string[]])
            : z.string()
        break
      }
      let s = z.string()
      if (stringProp.minLength !== undefined) {
        s = s.min(stringProp.minLength)
      }
      if (stringProp.maxLength !== undefined) {
        s = s.max(stringProp.maxLength)
      }
      if (stringProp.pattern) {
        s = s.regex(new RegExp(stringProp.pattern))
      }
      schema = s
      break
    }
    case 'number': {
      const numProp = prop as Extract<
        JsonSchema07PrimitiveProperty,
        { type: 'number' | ['number', 'null'] }
      >
      let s = z.number()
      if (numProp.minimum !== undefined) {
        s = s.min(numProp.minimum)
      }
      if (numProp.maximum !== undefined) {
        s = s.max(numProp.maximum)
      }
      schema = s
      break
    }
    case 'integer': {
      const intProp = prop as Extract<
        JsonSchema07PrimitiveProperty,
        { type: 'integer' | ['integer', 'null'] }
      >
      let s = z.number().int()
      if (intProp.minimum !== undefined) {
        s = s.min(intProp.minimum)
      }
      if (intProp.maximum !== undefined) {
        s = s.max(intProp.maximum)
      }
      schema = s
      break
    }
    case 'boolean':
      schema = z.boolean()
      break
  }
  return nullable ? schema.nullable() : schema
}

function nestedObjectToZod(prop: {
  type: 'object'
  properties?: Record<string, unknown>
  additionalProperties?: unknown
  required?: string[]
}): z.ZodType {
  // additionalProperties: validate all values against a schema (dynamic keys)
  if (prop.additionalProperties) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define, no-use-before-define
    const valueSchema = objectItemPropertyToZod(
      prop.additionalProperties as JsonSchema07ObjectItemProperty,
    )
    return z.record(z.string(), valueSchema)
  }

  const properties = prop.properties ?? {}
  const shape: Record<string, z.ZodType> = {}
  const requiredKeys = new Set(prop.required ?? [])
  for (const [key, nestedProp] of Object.entries(properties)) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define, no-use-before-define
    let fieldSchema = objectItemPropertyToZod(
      nestedProp as JsonSchema07ObjectItemProperty,
    )
    if (!requiredKeys.has(key)) {
      fieldSchema = fieldSchema.optional()
    }
    shape[key] = fieldSchema
  }
  if (Object.keys(shape).length === 0) {
    return z.record(z.string(), z.unknown())
  }
  return z.object(shape).strict()
}

function objectItemPropertyToZod(
  prop: JsonSchema07ObjectItemProperty,
): z.ZodType {
  if (prop.type === 'array') {
    let itemZod: z.ZodType
    if (prop.items.type === 'object') {
      itemZod = nestedObjectToZod(
        prop.items as {
          type: 'object'
          properties?: Record<string, unknown>
          additionalProperties?: unknown
          required?: string[]
        },
      )
    } else {
      itemZod = primitivePropertyToZod({
        type: prop.items.type,
      } as JsonSchema07PrimitiveProperty)
    }
    let schema = z.array(itemZod)
    if (prop.minItems !== undefined) {
      schema = schema.min(prop.minItems)
    }
    if (prop.maxItems !== undefined) {
      schema = schema.max(prop.maxItems)
    }
    return schema
  }
  if (prop.type === 'object') {
    return nestedObjectToZod(prop)
  }
  return primitivePropertyToZod(prop)
}

function objectItemToZod(itemSchema: JsonSchema07ObjectItem): z.ZodType {
  const shape: Record<string, z.ZodType> = {}
  const requiredKeys = new Set(itemSchema.required ?? [])

  for (const [key, prop] of Object.entries(itemSchema.properties)) {
    let fieldSchema = objectItemPropertyToZod(prop)
    if (!requiredKeys.has(key)) {
      fieldSchema = fieldSchema.optional()
    }
    shape[key] = fieldSchema
  }

  return z.object(shape).strict()
}

function discriminatedObjectItemToZod(
  itemSchema: JsonSchema07DiscriminatedObjectItem,
): z.ZodType {
  const variants = itemSchema.oneOf.map(
    (variant) =>
      objectItemToZod(variant) as z.ZodObject<Record<string, z.ZodType>>,
  )
  return z.discriminatedUnion(
    itemSchema.discriminator,
    variants as [
      z.ZodObject<Record<string, z.ZodType>>,
      ...z.ZodObject<Record<string, z.ZodType>>[],
    ],
  )
}

function propertyToZod(prop: JsonSchema07Property): z.ZodType {
  if (prop.type === 'object') {
    return nestedObjectToZod(prop)
  }

  if (prop.type !== 'array') {
    return primitivePropertyToZod(prop)
  }

  let itemZod: z.ZodType
  if ('discriminator' in prop.items) {
    itemZod = discriminatedObjectItemToZod(prop.items)
  } else if (prop.items.type === 'object') {
    itemZod = objectItemToZod(prop.items)
  } else {
    itemZod = primitivePropertyToZod({
      type: prop.items.type,
    } as JsonSchema07PrimitiveProperty)
  }
  let schema = z.array(itemZod)
  if (prop.minItems !== undefined) {
    schema = schema.min(prop.minItems)
  }
  if (prop.maxItems !== undefined) {
    schema = schema.max(prop.maxItems)
  }
  return schema
}

/**
 * Build compiled pattern entries from a schema's patternProperties.
 * Each entry pairs a RegExp with the Zod schema for matching values.
 */
function buildPatternEntries(
  schema: JsonSchema07Object,
): { regex: RegExp; zodSchema: z.ZodType }[] {
  if (!schema.patternProperties) {
    return []
  }
  return Object.entries(schema.patternProperties).map(([pattern, prop]) => ({
    regex: new RegExp(pattern),
    zodSchema: propertyToZod(prop),
  }))
}

/**
 * Create a superRefine that validates unknown keys against patternProperties.
 * Keys not in `properties` must match at least one pattern and pass its schema.
 */
function patternPropertiesRefinement(
  knownKeys: Set<string>,
  patterns: { regex: RegExp; zodSchema: z.ZodType }[],
) {
  return (val: Record<string, unknown>, ctx: z.RefinementCtx) => {
    for (const [key, value] of Object.entries(val)) {
      if (knownKeys.has(key)) {
        continue
      }

      const matched = patterns.find((p) => p.regex.test(key))
      if (!matched) {
        ctx.addIssue({
          code: 'unrecognized_keys',
          keys: [key],
          message: `Unrecognized key "${key}" does not match any property or pattern`,
        })
        continue
      }

      const result = matched.zodSchema.safeParse(value)
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({
            ...issue,
            path: [key, ...issue.path],
          })
        }
      }
    }
  }
}

/**
 * Convert a JSON Schema object definition to a Zod schema.
 * Returns a full (required fields enforced) schema.
 *
 * When `patternProperties` is present, keys not listed in `properties` are
 * validated against matching patterns instead of being rejected outright.
 */
export function jsonSchemaToZod(
  schema: JsonSchema07Object,
): z.ZodType<Record<string, unknown>> {
  const shape: Record<string, z.ZodType> = {}
  const requiredKeys = new Set(schema.required ?? [])

  for (const [key, prop] of Object.entries(schema.properties)) {
    let fieldSchema = propertyToZod(prop)
    if (!requiredKeys.has(key)) {
      fieldSchema = fieldSchema.optional()
    }
    shape[key] = fieldSchema
  }

  const patterns = buildPatternEntries(schema)
  if (patterns.length > 0) {
    const knownKeys = new Set(Object.keys(schema.properties))
    return z
      .object(shape)
      .loose()
      .superRefine(patternPropertiesRefinement(knownKeys, patterns))
  }

  return z.object(shape).strict()
}

/**
 * Convert a JSON Schema object definition to a partial Zod schema
 * where all fields are optional (for merge/patch semantics).
 * Also allows `null` values to indicate key removal.
 *
 * When `patternProperties` is present, keys not listed in `properties` are
 * validated against matching patterns (nullable + optional) instead of being
 * rejected outright.
 */
export function jsonSchemaToPartialZod(
  schema: JsonSchema07Object,
): z.ZodType<Record<string, unknown>> {
  const shape: Record<string, z.ZodType> = {}

  for (const [key, prop] of Object.entries(schema.properties)) {
    const fieldSchema = propertyToZod(prop)
    shape[key] = fieldSchema.nullable().optional()
  }

  const patterns = buildPatternEntries(schema)
  if (patterns.length > 0) {
    const knownKeys = new Set(Object.keys(schema.properties))
    // For partial mode, pattern-matched values must also accept null (removal)
    const nullablePatterns = patterns.map((p) => ({
      regex: p.regex,
      zodSchema: p.zodSchema.nullable(),
    }))
    return z
      .object(shape)
      .loose()
      .superRefine(patternPropertiesRefinement(knownKeys, nullablePatterns))
  }

  return z.object(shape).strict()
}

/**
 * Resolve a Zod validator for a single top-level settings key.
 *
 * Looks up the sub-schema in this order:
 *   1. Exact match in `schema.properties`
 *   2. First matching regex in `schema.patternProperties`
 * Returns `null` when the key is not covered by either — callers translate
 * that into a 400 "unknown setting key".
 */
export function jsonSchemaPropertyToZod(
  schema: JsonSchema07Object,
  key: string,
): z.ZodType | null {
  const directProp = schema.properties[key]
  if (directProp !== undefined) {
    return propertyToZod(directProp)
  }
  if (schema.patternProperties) {
    for (const [pattern, prop] of Object.entries(schema.patternProperties)) {
      if (new RegExp(pattern).test(key)) {
        return propertyToZod(prop)
      }
    }
  }
  return null
}

/**
 * Extract default values from a JSON Schema object definition.
 */
export function extractSchemaDefaults(
  schema: JsonSchema07Object,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (prop.default !== undefined) {
      defaults[key] = prop.default
    }
  }
  return defaults
}
