import type { JsonSchema07Object, JsonSchema07Property } from '@lombokapp/types'
import { z } from 'zod'

function propertyToZod(prop: JsonSchema07Property): z.ZodType {
  switch (prop.type) {
    case 'string': {
      let schema = z.string()
      if (prop.enum) {
        // Zod enum requires at least one value
        if (prop.enum.length > 0) {
          return z.enum(prop.enum as [string, ...string[]])
        }
        return schema
      }
      if (prop.minLength !== undefined) {
        schema = schema.min(prop.minLength)
      }
      if (prop.maxLength !== undefined) {
        schema = schema.max(prop.maxLength)
      }
      if (prop.pattern) {
        schema = schema.regex(new RegExp(prop.pattern))
      }
      return schema
    }
    case 'number': {
      let schema = z.number()
      if (prop.minimum !== undefined) {
        schema = schema.min(prop.minimum)
      }
      if (prop.maximum !== undefined) {
        schema = schema.max(prop.maximum)
      }
      return schema
    }
    case 'integer': {
      let schema = z.number().int()
      if (prop.minimum !== undefined) {
        schema = schema.min(prop.minimum)
      }
      if (prop.maximum !== undefined) {
        schema = schema.max(prop.maximum)
      }
      return schema
    }
    case 'boolean':
      return z.boolean()
    case 'array': {
      const itemSchema = propertyToZod({
        type: prop.items.type,
      } as JsonSchema07Property)
      let schema = z.array(itemSchema)
      if (prop.minItems !== undefined) {
        schema = schema.min(prop.minItems)
      }
      if (prop.maxItems !== undefined) {
        schema = schema.max(prop.maxItems)
      }
      return schema
    }
  }
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
