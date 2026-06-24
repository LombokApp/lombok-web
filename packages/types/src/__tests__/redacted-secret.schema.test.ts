import { describe, expect, it } from 'bun:test'

import { redactedSecret } from '../redacted-secret.schema'

describe('redactedSecret', () => {
  it('accepts null (the redacted value)', () => {
    expect(redactedSecret().parse(null)).toBeNull()
  })

  it('rejects a leaked secret string (the serializer guard)', () => {
    expect(() => redactedSecret().parse('super-secret')).toThrow()
  })

  it('rejects an empty string too', () => {
    expect(() => redactedSecret().parse('')).toThrow()
  })
})
