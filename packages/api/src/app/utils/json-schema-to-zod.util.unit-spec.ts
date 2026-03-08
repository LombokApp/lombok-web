import type { JsonSchema07Object } from '@lombokapp/types'
import { describe, expect, it } from 'bun:test'

import {
  extractSchemaDefaults,
  jsonSchemaToPartialZod,
  jsonSchemaToZod,
} from './json-schema-to-zod.util'

describe('jsonSchemaToZod', () => {
  it('should convert string type', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: { name: { type: 'string' } },
    }
    const zod = jsonSchemaToZod(schema)
    expect(zod.safeParse({ name: 'hello' }).success).toBe(true)
    expect(zod.safeParse({ name: 123 }).success).toBe(false)
  })

  it('should enforce string enum', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: { theme: { type: 'string', enum: ['light', 'dark'] } },
    }
    const zod = jsonSchemaToZod(schema)
    expect(zod.safeParse({ theme: 'light' }).success).toBe(true)
    expect(zod.safeParse({ theme: 'blue' }).success).toBe(false)
  })

  it('should enforce string minLength/maxLength', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {
        code: { type: 'string', minLength: 2, maxLength: 5 },
      },
    }
    const zod = jsonSchemaToZod(schema)
    expect(zod.safeParse({ code: 'ab' }).success).toBe(true)
    expect(zod.safeParse({ code: 'a' }).success).toBe(false)
    expect(zod.safeParse({ code: 'abcdef' }).success).toBe(false)
  })

  it('should enforce string pattern', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {
        id: { type: 'string', pattern: '^[a-z]+$' },
      },
    }
    const zod = jsonSchemaToZod(schema)
    expect(zod.safeParse({ id: 'abc' }).success).toBe(true)
    expect(zod.safeParse({ id: 'ABC' }).success).toBe(false)
  })

  it('should convert number type with constraints', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 0, maximum: 100 },
      },
    }
    const zod = jsonSchemaToZod(schema)
    expect(zod.safeParse({ score: 50 }).success).toBe(true)
    expect(zod.safeParse({ score: -1 }).success).toBe(false)
    expect(zod.safeParse({ score: 101 }).success).toBe(false)
  })

  it('should convert integer type', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {
        count: { type: 'integer', minimum: 0 },
      },
    }
    const zod = jsonSchemaToZod(schema)
    expect(zod.safeParse({ count: 5 }).success).toBe(true)
    expect(zod.safeParse({ count: 5.5 }).success).toBe(false)
  })

  it('should convert boolean type', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: { enabled: { type: 'boolean' } },
    }
    const zod = jsonSchemaToZod(schema)
    expect(zod.safeParse({ enabled: true }).success).toBe(true)
    expect(zod.safeParse({ enabled: 'yes' }).success).toBe(false)
  })

  it('should convert array type with constraints', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 3,
        },
      },
    }
    const zod = jsonSchemaToZod(schema)
    expect(zod.safeParse({ tags: ['a'] }).success).toBe(true)
    expect(zod.safeParse({ tags: [] }).success).toBe(false)
    expect(zod.safeParse({ tags: ['a', 'b', 'c', 'd'] }).success).toBe(false)
  })

  it('should enforce required fields', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
      },
      required: ['name'],
    }
    const zod = jsonSchemaToZod(schema)
    expect(zod.safeParse({ name: 'test' }).success).toBe(true)
    expect(zod.safeParse({ age: 25 }).success).toBe(false)
    expect(zod.safeParse({}).success).toBe(false)
  })

  it('should reject unknown keys (strict mode)', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: { name: { type: 'string' } },
    }
    const zod = jsonSchemaToZod(schema)
    expect(zod.safeParse({ name: 'test', extra: true }).success).toBe(false)
  })
})

describe('jsonSchemaToPartialZod', () => {
  it('should make all fields optional and nullable', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        count: { type: 'integer' },
      },
      required: ['name'],
    }
    const zod = jsonSchemaToPartialZod(schema)
    expect(zod.safeParse({}).success).toBe(true)
    expect(zod.safeParse({ name: null }).success).toBe(true)
    expect(zod.safeParse({ name: 'test' }).success).toBe(true)
  })
})

describe('extractSchemaDefaults', () => {
  it('should extract defaults from schema', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {
        theme: { type: 'string', default: 'light' },
        count: { type: 'integer', default: 3 },
        name: { type: 'string' },
      },
    }
    expect(extractSchemaDefaults(schema)).toEqual({
      theme: 'light',
      count: 3,
    })
  })

  it('should return empty object when no defaults', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: { name: { type: 'string' } },
    }
    expect(extractSchemaDefaults(schema)).toEqual({})
  })
})
