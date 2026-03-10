import type { JsonSchema07Object } from '@lombokapp/types'
import { describe, expect, it } from 'bun:test'

import { resolveCustomSettings } from './resolve-custom-settings.utils'

const schema: JsonSchema07Object = {
  type: 'object',
  properties: {
    api_key: { type: 'string' },
    max_retries: { type: 'integer', default: 3 },
    theme: { type: 'string', default: 'light' },
  },
}

describe('resolveCustomSettings', () => {
  it('should return defaults when no stored values', () => {
    const result = resolveCustomSettings(schema, undefined, undefined)
    expect(result.values).toEqual({ max_retries: 3, theme: 'light' })
    expect(result.sources).toEqual({ max_retries: 'default', theme: 'default' })
  })

  it('should use user values over defaults', () => {
    const result = resolveCustomSettings(
      schema,
      { api_key: 'sk-123', theme: 'dark' },
      undefined,
    )
    expect(result.values).toEqual({
      api_key: 'sk-123',
      max_retries: 3,
      theme: 'dark',
    })
    expect(result.sources).toEqual({
      api_key: 'user',
      max_retries: 'default',
      theme: 'user',
    })
  })

  it('should use folder values over user and defaults', () => {
    const result = resolveCustomSettings(
      schema,
      { api_key: 'sk-user', theme: 'dark' },
      { theme: 'light', max_retries: 5 },
    )
    expect(result.values).toEqual({
      api_key: 'sk-user',
      max_retries: 5,
      theme: 'light',
    })
    expect(result.sources).toEqual({
      api_key: 'user',
      max_retries: 'folder',
      theme: 'folder',
    })
  })

  it('should omit keys with no value at any level', () => {
    const result = resolveCustomSettings(schema, undefined, undefined)
    expect('api_key' in result.values).toBe(false)
    expect('api_key' in result.sources).toBe(false)
  })

  it('should handle empty schema', () => {
    const emptySchema: JsonSchema07Object = {
      type: 'object',
      properties: {},
    }
    const result = resolveCustomSettings(emptySchema, { x: 1 }, { y: 2 })
    expect(result.values).toEqual({})
    expect(result.sources).toEqual({})
  })
})
