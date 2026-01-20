/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, expect, it } from 'bun:test'

import {
  convertUnknownToJsonSerializableObject,
  convertUnknownToJsonSerializableValue,
} from '../json.types'

describe('json.types', () => {
  describe('convertUnknownToJsonSerializableValue', () => {
    describe('strict mode', () => {
      it('should convert valid primitives', () => {
        const result1 = convertUnknownToJsonSerializableValue('test', {
          mode: 'strict',
          throwErrors: false,
        })
        expect(result1).toBe('test')
        const result2 = convertUnknownToJsonSerializableValue(42, {
          mode: 'strict',
          throwErrors: false,
        })
        expect(result2).toBe(42)
        const result3 = convertUnknownToJsonSerializableValue(true, {
          mode: 'strict',
          throwErrors: false,
        })
        expect(result3).toBe(true)
        const result4 = convertUnknownToJsonSerializableValue(null, {
          mode: 'strict',
          throwErrors: false,
        })
        expect(result4).toBe(null)
      })

      it('should convert valid arrays', () => {
        const result = convertUnknownToJsonSerializableValue(
          [1, 2, 'three', true, null],
          { mode: 'strict', throwErrors: false },
        )
        expect(result).toEqual([1, 2, 'three', true, null])
      })

      it('should convert valid objects', () => {
        const result = convertUnknownToJsonSerializableValue(
          { a: 1, b: 'test', c: true, d: null },
          { mode: 'strict', throwErrors: false },
        )
        expect(result).toEqual({ a: 1, b: 'test', c: true, d: null })
      })

      it('should convert nested structures', () => {
        const result = convertUnknownToJsonSerializableValue(
          {
            a: 1,
            b: [2, { c: 3, d: [4, 5] }],
            e: { f: 'test', g: null },
          },
          { mode: 'strict', throwErrors: false },
        )
        expect(result).toEqual({
          a: 1,
          b: [2, { c: 3, d: [4, 5] }],
          e: { f: 'test', g: null },
        })
      })

      it('should throw error for functions', () => {
        expect(() => {
          convertUnknownToJsonSerializableValue(() => {}, {
            mode: 'strict',
            throwErrors: true,
          })
        }).toThrow()
      })

      it('should throw error for symbols', () => {
        expect(() => {
          convertUnknownToJsonSerializableValue(Symbol('test'), {
            mode: 'strict',
          })
        }).toThrow()
      })

      it('should throw error for undefined', () => {
        expect(() => {
          convertUnknownToJsonSerializableValue(undefined, { mode: 'strict' })
        }).toThrow()
      })

      it('should omit functions from objects (JSON.stringify omits them)', () => {
        const result = convertUnknownToJsonSerializableValue(
          { a: 1, fn: () => {} },
          { mode: 'strict', throwErrors: false },
        )
        expect(result).toEqual({ a: 1 })
      })

      it('should omit symbols from objects (JSON.stringify omits them)', () => {
        const result = convertUnknownToJsonSerializableValue(
          { a: 1, sym: Symbol('test') },
          { mode: 'strict', throwErrors: false },
        )
        expect(result).toEqual({ a: 1 })
      })

      it('should throw error for circular references', () => {
        const circular: { a?: unknown } = { a: 1 }
        circular.a = circular
        expect(() => {
          convertUnknownToJsonSerializableValue(circular, {
            mode: 'strict',
            throwErrors: true,
          })
        }).toThrow()
      })
    })

    describe('recursive mode', () => {
      it('should convert valid primitives', () => {
        const result1 = convertUnknownToJsonSerializableValue('test', {
          mode: 'recursive',
        })
        expect(result1).toBe('test')
        const result2 = convertUnknownToJsonSerializableValue(42, {
          mode: 'recursive',
        })
        expect(result2).toBe(42)
        const result3 = convertUnknownToJsonSerializableValue(true, {
          mode: 'recursive',
        })
        expect(result3).toBe(true)
        const result4 = convertUnknownToJsonSerializableValue(null, {
          mode: 'recursive',
        })
        expect(result4).toBe(null)
      })

      it('should convert valid arrays', () => {
        const result = convertUnknownToJsonSerializableValue(
          [1, 2, 'three', true, null],
          { mode: 'recursive', throwErrors: false },
        )
        expect(result).toEqual([1, 2, 'three', true, null])
      })

      it('should convert valid objects', () => {
        const result = convertUnknownToJsonSerializableValue(
          { a: 1, b: 'test', c: true, d: null },
          { mode: 'recursive', throwErrors: false },
        )
        expect(result).toEqual({ a: 1, b: 'test', c: true, d: null })
      })

      it('should convert nested structures', () => {
        const result = convertUnknownToJsonSerializableValue(
          {
            a: 1,
            b: [2, { c: 3, d: [4, 5] }],
            e: { f: 'test', g: null },
          },
          { mode: 'recursive', throwErrors: false },
        )
        expect(result).toEqual({
          a: 1,
          b: [2, { c: 3, d: [4, 5] }],
          e: { f: 'test', g: null },
        })
      })

      it('should omit functions from objects', () => {
        const result = convertUnknownToJsonSerializableValue(
          { a: 1, fn: () => {}, b: 'test' },
          { mode: 'recursive', throwErrors: false },
        )
        expect(result).toEqual({ a: 1, b: 'test' })
      })

      it('should omit symbols from objects', () => {
        const result = convertUnknownToJsonSerializableValue(
          { a: 1, sym: Symbol('test'), b: 'test' },
          { mode: 'recursive', throwErrors: false },
        )
        expect(result).toEqual({ a: 1, b: 'test' })
      })

      it('should omit undefined from objects', () => {
        const result = convertUnknownToJsonSerializableValue(
          { a: 1, undef: undefined, b: 'test' },
          { mode: 'recursive', throwErrors: false },
        )
        expect(result).toEqual({ a: 1, b: 'test' })
      })

      it('should omit invalid values from arrays', () => {
        const result = convertUnknownToJsonSerializableValue(
          [1, () => {}, 'test', Symbol('test'), undefined, 2],
          { mode: 'recursive', throwErrors: false },
        )
        expect(result).toEqual([1, 'test', 2])
      })

      it('should handle nested objects with invalid values', () => {
        const result = convertUnknownToJsonSerializableValue(
          {
            a: 1,
            b: {
              c: 2,
              fn: () => {},
              d: {
                e: 3,
                sym: Symbol('test'),
                f: 'valid',
              },
            },
            g: 'test',
          },
          { mode: 'recursive', throwErrors: false },
        )
        expect(result).toEqual({
          a: 1,
          b: {
            c: 2,
            d: {
              e: 3,
              f: 'valid',
            },
          },
          g: 'test',
        })
      })

      it('should handle arrays with nested invalid values', () => {
        const result = convertUnknownToJsonSerializableValue(
          [1, { a: 2, fn: () => {} }, [3, Symbol('test'), 4], 'test'],
          { mode: 'recursive', throwErrors: false },
        )
        expect(result).toEqual([1, { a: 2 }, [3, 4], 'test'])
      })

      it('should throw error for top-level function', () => {
        expect(() => {
          convertUnknownToJsonSerializableValue(() => {}, {
            mode: 'recursive',
            throwErrors: true,
          })
        }).toThrow('Failed to convert value to JsonSerializableValue')
      })

      it('should throw error for top-level symbol', () => {
        expect(() => {
          convertUnknownToJsonSerializableValue(Symbol('test'), {
            mode: 'recursive',
          })
        }).toThrow('Failed to convert value to JsonSerializableValue')
      })

      it('should throw error for top-level undefined', () => {
        expect(() => {
          convertUnknownToJsonSerializableValue(undefined, {
            mode: 'recursive',
          })
        }).toThrow('Failed to convert value to JsonSerializableValue')
      })

      it('should handle Date objects by converting to empty objects', () => {
        const date = new Date('2023-01-01T00:00:00Z')
        const result = convertUnknownToJsonSerializableValue(
          { date, other: 'value' },
          { mode: 'recursive', throwErrors: false },
        )
        // Date objects have no enumerable properties, so they become empty objects
        expect(result).toEqual({ date: {}, other: 'value' })
      })

      it('should handle RegExp objects by converting to empty objects', () => {
        const result = convertUnknownToJsonSerializableValue(
          { a: 1, regex: /test/ },
          { mode: 'recursive', throwErrors: false },
        )
        // RegExp objects have no enumerable properties, so they become empty objects
        expect(result).toEqual({ a: 1, regex: {} })
      })

      it('should handle Map objects by converting to empty objects', () => {
        const result = convertUnknownToJsonSerializableValue(
          { a: 1, map: new Map([['key', 'value']]) },
          { mode: 'recursive', throwErrors: false },
        )
        // Map objects have no enumerable properties, so they become empty objects
        expect(result).toEqual({ a: 1, map: {} })
      })

      it('should handle Set objects by converting to empty objects', () => {
        const result = convertUnknownToJsonSerializableValue(
          { a: 1, set: new Set([1, 2, 3]) },
          { mode: 'recursive', throwErrors: false },
        )
        // Set objects have no enumerable properties, so they become empty objects
        expect(result).toEqual({ a: 1, set: {} })
      })

      it('should handle mixed valid and invalid values in complex structure', () => {
        const result = convertUnknownToJsonSerializableValue(
          {
            valid: 'value',
            number: 42,
            array: [1, () => {}, 2, { nested: 'ok', invalid: Symbol('test') }],
            object: {
              keep: true,
              remove: undefined,
              nested: {
                deep: 'value',
                fn: () => {},
              },
            },
            nullValue: null,
            boolean: false,
          },
          { mode: 'recursive', throwErrors: false },
        )
        expect(result).toEqual({
          valid: 'value',
          number: 42,
          array: [1, 2, { nested: 'ok' }],
          object: {
            keep: true,
            nested: {
              deep: 'value',
            },
          },
          nullValue: null,
          boolean: false,
        })
      })
    })

    describe('default mode (strict)', () => {
      it('should default to strict mode', () => {
        const result = convertUnknownToJsonSerializableValue('test')
        expect(result).toBe('test')
        expect(() => {
          const fn = () => {}
          convertUnknownToJsonSerializableValue(fn)
        }).toThrow()
      })
    })

    describe('ignoreErrors option', () => {
      it('should return undefined for top-level function when throwErrors is false in recursive mode', () => {
        const result = convertUnknownToJsonSerializableValue(() => {}, {
          mode: 'recursive',
          throwErrors: false,
        })
        expect(result).toBeUndefined()
      })

      it('should return undefined for top-level symbol when throwErrors is false in recursive mode', () => {
        const result = convertUnknownToJsonSerializableValue(Symbol('test'), {
          mode: 'recursive',
          throwErrors: false,
        })
        expect(result).toBeUndefined()
      })

      it('should return undefined for top-level undefined when throwErrors is false in recursive mode', () => {
        const result = convertUnknownToJsonSerializableValue(undefined, {
          mode: 'recursive',
          throwErrors: false,
        })
        expect(result).toBeUndefined()
      })

      it('should return undefined in strict mode when throwErrors is false', () => {
        const result = convertUnknownToJsonSerializableValue(() => {}, {
          mode: 'strict',
          throwErrors: false,
        })
        expect(result).toBeUndefined()
      })
    })
  })

  describe('convertUnknownToJsonSerializableObject', () => {
    describe('strict mode', () => {
      it('should convert valid objects', () => {
        const result = convertUnknownToJsonSerializableObject(
          { a: 1, b: 'test', c: true },
          { mode: 'strict', throwErrors: true },
        )
        expect(result).toEqual({ a: 1, b: 'test', c: true })
      })

      it('should convert nested objects', () => {
        const result = convertUnknownToJsonSerializableObject(
          {
            a: 1,
            b: { c: 2, d: 'test' },
            e: [1, 2, 3],
          },
          { mode: 'strict', throwErrors: true },
        )
        expect(result).toEqual({
          a: 1,
          b: { c: 2, d: 'test' },
          e: [1, 2, 3],
        })
      })

      it('should throw error for primitives', () => {
        expect(() => {
          convertUnknownToJsonSerializableObject('test', {
            mode: 'strict',
            throwErrors: true,
          })
        }).toThrow('Value must be')
      })

      it('should throw error for arrays', () => {
        expect(() => {
          convertUnknownToJsonSerializableObject([1, 2, 3], {
            mode: 'strict',
            throwErrors: true,
          })
        }).toThrow('Value must be')
      })

      it('should throw error for null', () => {
        expect(() => {
          convertUnknownToJsonSerializableObject(null, {
            mode: 'strict',
            throwErrors: true,
          })
        }).toThrow('Value must be')
      })

      it('should omit functions from objects (JSON.stringify omits them)', () => {
        const result = convertUnknownToJsonSerializableObject(
          { a: 1, fn: () => {} },
          { mode: 'strict', throwErrors: true },
        )
        expect(result).toEqual({ a: 1 })
      })

      it('should omit symbols from objects (JSON.stringify omits them)', () => {
        const result = convertUnknownToJsonSerializableObject(
          { a: 1, sym: Symbol('test') },
          { mode: 'strict', throwErrors: true },
        )
        expect(result).toEqual({ a: 1 })
      })
    })

    describe('recursive mode', () => {
      it('should convert valid objects', () => {
        const result = convertUnknownToJsonSerializableObject(
          { a: 1, b: 'test', c: true },
          { mode: 'recursive', throwErrors: true },
        )
        expect(result).toEqual({ a: 1, b: 'test', c: true })
      })

      it('should convert nested objects', () => {
        const result = convertUnknownToJsonSerializableObject(
          {
            a: 1,
            b: { c: 2, d: 'test' },
            e: [1, 2, 3],
          },
          { mode: 'recursive', throwErrors: false },
        )
        expect(result).toEqual({
          a: 1,
          b: { c: 2, d: 'test' },
          e: [1, 2, 3],
        })
      })

      it('should omit invalid properties from objects', () => {
        const result = convertUnknownToJsonSerializableObject(
          {
            a: 1,
            fn: () => {},
            b: 'test',
            sym: Symbol('test'),
            undef: undefined,
            c: true,
          },
          { mode: 'recursive', throwErrors: true },
        )
        expect(result).toEqual({ a: 1, b: 'test', c: true })
      })

      it('should handle nested objects with invalid values', () => {
        const result = convertUnknownToJsonSerializableObject(
          {
            valid: 'value',
            nested: {
              keep: 42,
              remove: () => {},
              deep: {
                value: 'test',
                invalid: Symbol('test'),
              },
            },
          },
          { mode: 'recursive', throwErrors: true },
        )
        expect(result).toEqual({
          valid: 'value',
          nested: {
            keep: 42,
            deep: {
              value: 'test',
            },
          },
        })
      })

      it('should throw error for primitives', () => {
        expect(() => {
          convertUnknownToJsonSerializableObject('test', {
            mode: 'recursive',
            throwErrors: true,
          })
        }).toThrow('Value must be')
      })

      it('should throw error for arrays', () => {
        expect(() => {
          convertUnknownToJsonSerializableObject([1, 2, 3], {
            mode: 'recursive',
            throwErrors: true,
          })
        }).toThrow('Value must be')
      })

      it('should throw error for null', () => {
        expect(() => {
          convertUnknownToJsonSerializableObject(null, {
            mode: 'recursive',
            throwErrors: true,
          })
        }).toThrow('Value must be')
      })

      it('should handle empty objects', () => {
        const result = convertUnknownToJsonSerializableObject(
          {},
          { mode: 'recursive' },
        )
        expect(result).toEqual({})
      })

      it('should handle objects with only invalid values', () => {
        const result = convertUnknownToJsonSerializableObject(
          {
            fn: () => {},
            sym: Symbol('test'),
            undef: undefined,
          },
          { mode: 'recursive', throwErrors: true },
        )
        expect(result).toEqual({})
      })
    })

    describe('default mode (strict)', () => {
      it('should default to strict mode', () => {
        const result = convertUnknownToJsonSerializableObject({ a: 1 })
        expect(result).toEqual({ a: 1 })
        // Functions are omitted by JSON.stringify, not causing errors
        const resultWithFn = convertUnknownToJsonSerializableObject({
          fn: () => {},
        })
        expect(resultWithFn).toEqual({})
      })
    })

    describe('throwErrors option', () => {
      it('should return undefined for primitives when throwErrors is false', () => {
        const result = convertUnknownToJsonSerializableObject('test', {
          mode: 'strict',
          throwErrors: false,
        })
        expect(result).toBeUndefined()
      })

      it('should return undefined for arrays when throwErrors is false', () => {
        const result = convertUnknownToJsonSerializableObject([1, 2, 3], {
          mode: 'strict',
          throwErrors: false,
        })
        expect(result).toBeUndefined()
      })

      it('should return undefined for null when throwErrors is false', () => {
        const result = convertUnknownToJsonSerializableObject(null, {
          mode: 'strict',
          throwErrors: false,
        })
        expect(result).toBeUndefined()
      })

      it('should return undefined for primitives in recursive mode when throwErrors is false', () => {
        const result = convertUnknownToJsonSerializableObject('test', {
          mode: 'recursive',
          throwErrors: false,
        })
        expect(result).toBeUndefined()
      })
    })
  })
})
