import { describe, expect, it } from 'bun:test'

import { isSecretKey, maskSecretValues } from './custom-settings-secrets.utils'

const pattern = '^(api_key|secret|token)'

describe('isSecretKey', () => {
  it('should match keys starting with pattern', () => {
    expect(isSecretKey('api_key', pattern)).toBe(true)
    expect(isSecretKey('secret_value', pattern)).toBe(true)
    expect(isSecretKey('token_abc', pattern)).toBe(true)
  })

  it('should not match non-secret keys', () => {
    expect(isSecretKey('theme', pattern)).toBe(false)
    expect(isSecretKey('max_retries', pattern)).toBe(false)
  })

  it('should return false when no pattern', () => {
    expect(isSecretKey('api_key', undefined)).toBe(false)
  })
})

describe('maskSecretValues', () => {
  it('should mask secret keys', () => {
    const result = maskSecretValues(
      { api_key: 'sk-123', theme: 'dark' },
      pattern,
    )
    expect(result).toEqual({ api_key: '********', theme: 'dark' })
  })

  it('should return values unchanged when no pattern', () => {
    const values = { api_key: 'sk-123' }
    expect(maskSecretValues(values, undefined)).toEqual(values)
  })
})
