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

  it('should allow keys matching patternProperties', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {
        GITHUB_TOKEN: { type: 'string' },
      },
      patternProperties: {
        '^ANTHROPIC_API_KEY(_[A-Za-z0-9]+)?$': { type: 'string' },
      },
    }
    const zod = jsonSchemaToZod(schema)
    expect(zod.safeParse({ ANTHROPIC_API_KEY: 'sk-abc' }).success).toBe(true)
    expect(zod.safeParse({ ANTHROPIC_API_KEY_1234: 'sk-abc' }).success).toBe(
      true,
    )
    expect(
      zod.safeParse({ GITHUB_TOKEN: 'ghp_abc', ANTHROPIC_API_KEY: 'sk-abc' })
        .success,
    ).toBe(true)
  })

  it('should reject keys that only partially match a pattern', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {},
      patternProperties: {
        '^ANTHROPIC_API_KEY(_[A-Za-z0-9]+)?$': { type: 'string' },
      },
    }
    const zod = jsonSchemaToZod(schema)
    // Trailing garbage after the key name
    expect(zod.safeParse({ ANTHROPIC_API_KEYBOARD: 'value' }).success).toBe(
      false,
    )
    // Suffix without underscore separator
    expect(zod.safeParse({ ANTHROPIC_API_KEYextra: 'value' }).success).toBe(
      false,
    )
  })

  it('should reject keys not matching any property or pattern', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {
        GITHUB_TOKEN: { type: 'string' },
      },
      patternProperties: {
        '^ANTHROPIC_API_KEY(_[A-Za-z0-9]+)?$': { type: 'string' },
      },
    }
    const zod = jsonSchemaToZod(schema)
    expect(zod.safeParse({ UNKNOWN_KEY: 'value' }).success).toBe(false)
  })

  it('should validate pattern-matched values against the pattern schema', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {},
      patternProperties: {
        '^ANTHROPIC_API_KEY(_[A-Za-z0-9]+)?$': { type: 'string' },
      },
    }
    const zod = jsonSchemaToZod(schema)
    expect(zod.safeParse({ ANTHROPIC_API_KEY: 123 }).success).toBe(false)
  })

  it('should validate array properties within object items', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {
        configs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              tags: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
              },
            },
            required: ['name', 'tags'],
          },
        },
      },
    }
    const zod = jsonSchemaToZod(schema)
    expect(
      zod.safeParse({ configs: [{ name: 'a', tags: ['x'] }] }).success,
    ).toBe(true)
    expect(zod.safeParse({ configs: [{ name: 'a', tags: [] }] }).success).toBe(
      false,
    )
    expect(
      zod.safeParse({ configs: [{ name: 'a', tags: [123] }] }).success,
    ).toBe(false)
  })

  it('should validate discriminated union array items', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {
        providers: {
          type: 'array',
          items: {
            discriminator: 'TYPE',
            oneOf: [
              {
                type: 'object',
                properties: {
                  TYPE: { type: 'string', enum: ['anthropic'] },
                  API_KEY: { type: 'string' },
                },
                required: ['TYPE', 'API_KEY'],
              },
              {
                type: 'object',
                properties: {
                  TYPE: { type: 'string', enum: ['openai_compatible'] },
                  API_KEY: { type: 'string' },
                  ENDPOINT: { type: 'string' },
                  MODELS: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 1,
                  },
                },
                required: ['TYPE', 'API_KEY', 'ENDPOINT', 'MODELS'],
              },
            ],
          },
        },
      },
    }
    const zod = jsonSchemaToZod(schema)

    // Valid anthropic
    expect(
      zod.safeParse({
        providers: [{ TYPE: 'anthropic', API_KEY: 'sk-abc' }],
      }).success,
    ).toBe(true)

    // Valid openai_compatible
    expect(
      zod.safeParse({
        providers: [
          {
            TYPE: 'openai_compatible',
            API_KEY: 'sk-abc',
            ENDPOINT: 'https://llm.example.com',
            MODELS: ['gpt-4'],
          },
        ],
      }).success,
    ).toBe(true)

    // openai_compatible missing ENDPOINT
    expect(
      zod.safeParse({
        providers: [
          {
            TYPE: 'openai_compatible',
            API_KEY: 'sk-abc',
            MODELS: ['gpt-4'],
          },
        ],
      }).success,
    ).toBe(false)

    // openai_compatible missing MODELS
    expect(
      zod.safeParse({
        providers: [
          {
            TYPE: 'openai_compatible',
            API_KEY: 'sk-abc',
            ENDPOINT: 'https://llm.example.com',
          },
        ],
      }).success,
    ).toBe(false)

    // Unknown discriminator value
    expect(
      zod.safeParse({
        providers: [{ TYPE: 'unknown', API_KEY: 'sk-abc' }],
      }).success,
    ).toBe(false)

    // anthropic with extra ENDPOINT (not in schema) should fail strict mode
    expect(
      zod.safeParse({
        providers: [
          { TYPE: 'anthropic', API_KEY: 'sk-abc', ENDPOINT: 'http://x' },
        ],
      }).success,
    ).toBe(false)
  })

  it('should validate mixed discriminated union items in same array', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {
        providers: {
          type: 'array',
          items: {
            discriminator: 'TYPE',
            oneOf: [
              {
                type: 'object',
                properties: {
                  TYPE: { type: 'string', enum: ['a'] },
                  NAME: { type: 'string' },
                },
                required: ['TYPE'],
              },
              {
                type: 'object',
                properties: {
                  TYPE: { type: 'string', enum: ['b'] },
                  COUNT: { type: 'integer' },
                },
                required: ['TYPE', 'COUNT'],
              },
            ],
          },
        },
      },
    }
    const zod = jsonSchemaToZod(schema)
    expect(
      zod.safeParse({
        providers: [
          { TYPE: 'a', NAME: 'hello' },
          { TYPE: 'b', COUNT: 5 },
        ],
      }).success,
    ).toBe(true)
    // Type 'b' missing required COUNT
    expect(
      zod.safeParse({
        providers: [{ TYPE: 'a' }, { TYPE: 'b' }],
      }).success,
    ).toBe(false)
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

  it('should allow pattern-matched keys with nullable values', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {
        GITHUB_TOKEN: { type: 'string' },
      },
      patternProperties: {
        '^ANTHROPIC_API_KEY(_[A-Za-z0-9]+)?$': { type: 'string' },
      },
    }
    const zod = jsonSchemaToPartialZod(schema)
    expect(zod.safeParse({ ANTHROPIC_API_KEY: 'sk-abc' }).success).toBe(true)
    expect(zod.safeParse({ ANTHROPIC_API_KEY: null }).success).toBe(true)
    expect(zod.safeParse({ ANTHROPIC_API_KEY_1234: 'sk-abc' }).success).toBe(
      true,
    )
  })

  it('should reject unknown keys even in partial mode', () => {
    const schema: JsonSchema07Object = {
      type: 'object',
      properties: {
        GITHUB_TOKEN: { type: 'string' },
      },
      patternProperties: {
        '^ANTHROPIC_API_KEY(_[A-Za-z0-9]+)?$': { type: 'string' },
      },
    }
    const zod = jsonSchemaToPartialZod(schema)
    expect(zod.safeParse({ UNKNOWN_KEY: 'value' }).success).toBe(false)
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
