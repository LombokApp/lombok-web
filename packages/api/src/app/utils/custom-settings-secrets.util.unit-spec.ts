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

  it('should mask leaves of a secret-keyed object, preserving structure', () => {
    // Unanchored (substring) pattern: a variable whose name contains "api_key"
    // is secret, so its whole object value is masked leaf-by-leaf while keeping
    // the { value } shape intact.
    const result = maskSecretValues(
      {
        variable_ci_api_key: { value: 'sk-123' },
        variable_region: { value: 'eu' },
      },
      '(token|api_key)',
    )
    expect(result).toEqual({
      variable_ci_api_key: { value: '********' },
      variable_region: { value: 'eu' },
    })
  })

  it('should mask secret sub-keys within a non-secret object', () => {
    const result = maskSecretValues(
      { config: { token: 't-1', name: 'prod' } },
      pattern,
    )
    expect(result).toEqual({ config: { token: '********', name: 'prod' } })
  })

  it('should mask secret sub-keys within arrays of objects', () => {
    const result = maskSecretValues(
      { providers: [{ token: 't-1', label: 'a' }] },
      pattern,
    )
    expect(result).toEqual({ providers: [{ token: '********', label: 'a' }] })
  })
})
