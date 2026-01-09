import { describe, expect, it } from 'bun:test'

import { findIllegalJsonChars } from './json-sanitize'

describe('json-sanitize', () => {
  describe('findIllegalJsonChars', () => {
    it('should return null for valid JSON values', () => {
      expect(findIllegalJsonChars(null)).toBeNull()
      expect(findIllegalJsonChars(true)).toBeNull()
      expect(findIllegalJsonChars(false)).toBeNull()
      expect(findIllegalJsonChars(42)).toBeNull()
      expect(findIllegalJsonChars('valid string')).toBeNull()
      expect(findIllegalJsonChars([])).toBeNull()
      expect(findIllegalJsonChars({})).toBeNull()
      expect(findIllegalJsonChars({ a: 1, b: 'test' })).toBeNull()
      expect(findIllegalJsonChars([1, 2, 3])).toBeNull()
      expect(findIllegalJsonChars({ nested: { value: 'test' } })).toBeNull()
    })

    it('should detect NUL characters in strings', () => {
      const finding = findIllegalJsonChars('test\u0000string')
      expect(finding).not.toBeNull()
      expect(finding?.reason).toBe('nul_in_string')
      expect(finding?.path).toBe('$')
    })

    it('should detect NUL characters in nested strings', () => {
      const finding = findIllegalJsonChars({
        level1: {
          level2: 'test\u0000nested',
        },
      })
      expect(finding).not.toBeNull()
      expect(finding?.reason).toBe('nul_in_string')
      expect(finding?.path).toBe('$.level1.level2')
    })

    it('should detect control characters in strings', () => {
      const finding = findIllegalJsonChars('test\u0001control')
      expect(finding).not.toBeNull()
      expect(finding?.reason).toBe('control_char_in_string')
      expect(finding?.path).toBe('$')
      expect(finding?.detail).toBe('U+0001')
    })

    it('should allow tab, newline, and carriage return', () => {
      expect(findIllegalJsonChars('test\ttab')).toBeNull()
      expect(findIllegalJsonChars('test\nnewline')).toBeNull()
      expect(findIllegalJsonChars('test\rreturn')).toBeNull()
    })

    it('should detect non-finite numbers', () => {
      const findingInf = findIllegalJsonChars(Infinity)
      expect(findingInf).not.toBeNull()
      expect(findingInf?.reason).toBe('non_finite_number')
      expect(findingInf?.path).toBe('$')

      const findingNaN = findIllegalJsonChars(NaN)
      expect(findingNaN).not.toBeNull()
      expect(findingNaN?.reason).toBe('non_finite_number')
      expect(findingNaN?.path).toBe('$')
    })

    it('should detect non-finite numbers in nested objects', () => {
      const finding = findIllegalJsonChars({
        valid: 42,
        invalid: Infinity,
      })
      expect(finding).not.toBeNull()
      expect(finding?.reason).toBe('non_finite_number')
      expect(finding?.path).toBe('$.invalid')
    })

    it('should detect binary data when disallowBinary is true', () => {
      const buffer = new Uint8Array([1, 2, 3])
      const finding = findIllegalJsonChars(buffer, { disallowBinary: true })
      expect(finding).not.toBeNull()
      expect(finding?.reason).toBe('binary_not_allowed')
      expect(finding?.path).toBe('$')
    })

    it('should allow binary data when disallowBinary is false', () => {
      const buffer = new Uint8Array([1, 2, 3])
      const finding = findIllegalJsonChars(buffer, { disallowBinary: false })
      expect(finding).toBeNull()
    })

    it('should detect unsupported types', () => {
      const findingBigInt = findIllegalJsonChars(BigInt(42))
      expect(findingBigInt).not.toBeNull()
      expect(findingBigInt?.reason).toBe('unsupported_type')
      expect(findingBigInt?.detail).toBe('bigint')

      const findingSymbol = findIllegalJsonChars(Symbol('test'))
      expect(findingSymbol).not.toBeNull()
      expect(findingSymbol?.reason).toBe('unsupported_type')
      expect(findingSymbol?.detail).toBe('symbol')

      const findingUndefined = findIllegalJsonChars(undefined)
      expect(findingUndefined).not.toBeNull()
      expect(findingUndefined?.reason).toBe('unsupported_type')
      expect(findingUndefined?.detail).toBe('undefined')
    })

    it('should detect circular references', () => {
      const circular: Record<string, unknown> = { a: 1 }
      circular.b = circular
      const finding = findIllegalJsonChars(circular)
      expect(finding).not.toBeNull()
      expect(finding?.reason).toBe('circular_reference')
      expect(finding?.path).toBe('$.b')
    })

    it('should detect issues in arrays', () => {
      const finding = findIllegalJsonChars(['valid', 'test\u0000nul', 'more'])
      expect(finding).not.toBeNull()
      expect(finding?.reason).toBe('nul_in_string')
      expect(finding?.path).toBe('$[1]')
    })

    it('should detect issues in nested arrays', () => {
      const finding = findIllegalJsonChars({
        items: [
          { name: 'item1', value: 1 },
          { name: 'item2', value: Infinity },
        ],
      })
      expect(finding).not.toBeNull()
      expect(finding?.reason).toBe('non_finite_number')
      expect(finding?.path).toBe('$.items[1].value')
    })

    it('should return the first finding encountered', () => {
      const finding = findIllegalJsonChars({
        first: 'test\u0000nul',
        second: 'test\u0001control',
        third: Infinity,
      })
      expect(finding).not.toBeNull()
      expect(finding?.reason).toBe('nul_in_string')
      expect(finding?.path).toBe('$.first')
    })
  })
})
