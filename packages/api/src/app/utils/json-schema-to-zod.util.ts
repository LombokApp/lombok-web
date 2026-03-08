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
 * Convert a JSON Schema object definition to a Zod schema.
 * Returns a full (required fields enforced) schema.
 */
export function jsonSchemaToZod(
  schema: JsonSchema07Object,
): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodType> = {}
  const requiredKeys = new Set(schema.required ?? [])

  for (const [key, prop] of Object.entries(schema.properties)) {
    let fieldSchema = propertyToZod(prop)
    if (!requiredKeys.has(key)) {
      fieldSchema = fieldSchema.optional()
    }
    shape[key] = fieldSchema
  }

  return z.object(shape).strict()
}

/**
 * Convert a JSON Schema object definition to a partial Zod schema
 * where all fields are optional (for merge/patch semantics).
 * Also allows `null` values to indicate key removal.
 */
export function jsonSchemaToPartialZod(
  schema: JsonSchema07Object,
): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodType> = {}

  for (const [key, prop] of Object.entries(schema.properties)) {
    const fieldSchema = propertyToZod(prop)
    shape[key] = fieldSchema.nullable().optional()
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
