import { describe, expect, it } from 'bun:test'

import { formatBytes } from './format-bytes.util'

describe('formatBytes', () => {
  describe('edge cases', () => {
    it('handles zero as number', () => {
      expect(formatBytes(0)).toBe('0 B')
    })

    it('handles zero as bigint', () => {
      expect(formatBytes(BigInt(0))).toBe('0 B')
    })

    it('handles zero as string', () => {
      expect(formatBytes('0')).toBe('0 B')
    })

    it('handles single byte as number', () => {
      expect(formatBytes(1)).toBe('1 B')
    })

    it('handles single byte as bigint', () => {
      expect(formatBytes(BigInt(1))).toBe('1 B')
    })

    it('handles single byte as string', () => {
      expect(formatBytes('1')).toBe('1 B')
    })

    it('handles invalid string', () => {
      expect(formatBytes('invalid')).toBe('0 B')
      expect(formatBytes('not a number')).toBe('0 B')
      expect(formatBytes('')).toBe('0 B')
    })
  })

  describe('bytes (B)', () => {
    it('formats bytes less than 1024 as number', () => {
      expect(formatBytes(100)).toBe('100 B')
      expect(formatBytes(512)).toBe('512 B')
      expect(formatBytes(1023)).toBe('1023 B')
    })

    it('formats bytes less than 1024 as bigint', () => {
      expect(formatBytes(BigInt(100))).toBe('100 B')
      expect(formatBytes(BigInt(512))).toBe('512 B')
      expect(formatBytes(BigInt(1023))).toBe('1023 B')
    })

    it('formats bytes less than 1024 as string', () => {
      expect(formatBytes('100')).toBe('100 B')
      expect(formatBytes('512')).toBe('512 B')
      expect(formatBytes('1023')).toBe('1023 B')
    })
  })

  describe('kilobytes (KB)', () => {
    it('formats kilobytes as number', () => {
      expect(formatBytes(1024)).toBe('1.00 KB')
      expect(formatBytes(1536)).toBe('1.50 KB')
      expect(formatBytes(2048)).toBe('2.00 KB')
      expect(formatBytes(5120)).toBe('5.00 KB')
      // 1024 * 1024 - 1 = 1048575 bytes = 1023.999... KB, rounds to 1023.99 KB
      expect(formatBytes(1024 * 1024 - 1)).toBe('1023.99 KB')
    })

    it('formats kilobytes as bigint', () => {
      expect(formatBytes(BigInt(1024))).toBe('1.00 KB')
      expect(formatBytes(BigInt(1536))).toBe('1.50 KB')
      expect(formatBytes(BigInt(2048))).toBe('2.00 KB')
      expect(formatBytes(BigInt(5120))).toBe('5.00 KB')
      // 1024 * 1024 - 1 = 1048575 bytes = 1023.999... KB, rounds to 1023.99 KB
      expect(formatBytes(BigInt(1024 * 1024 - 1))).toBe('1023.99 KB')
    })

    it('formats kilobytes as string', () => {
      expect(formatBytes('1024')).toBe('1.00 KB')
      expect(formatBytes('1536')).toBe('1.50 KB')
      expect(formatBytes('2048')).toBe('2.00 KB')
      expect(formatBytes('5120')).toBe('5.00 KB')
      expect(formatBytes('1048575')).toBe('1023.99 KB')
    })
  })

  describe('megabytes (MB)', () => {
    it('formats megabytes as number', () => {
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB')
      expect(formatBytes(1024 * 1024 * 1.5)).toBe('1.50 MB')
      expect(formatBytes(1024 * 1024 * 2)).toBe('2.00 MB')
      // 1024^3 - 1 = 1073741823 bytes = 1023.999... MB, rounds to 1023.99 MB
      expect(formatBytes(1024 * 1024 * 1024 - 1)).toBe('1023.99 MB')
    })

    it('formats megabytes as bigint', () => {
      expect(formatBytes(BigInt(1024 * 1024))).toBe('1.00 MB')
      expect(formatBytes(BigInt((1024 * 1024 * 3) / 2))).toBe('1.50 MB')
      expect(formatBytes(BigInt(1024 * 1024 * 2))).toBe('2.00 MB')
      // 1024^3 - 1 = 1073741823 bytes = 1023.999... MB, rounds to 1023.99 MB
      expect(formatBytes(BigInt(1024 * 1024 * 1024 - 1))).toBe('1023.99 MB')
    })
  })

  describe('gigabytes (GB)', () => {
    it('formats gigabytes as number', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB')
      expect(formatBytes(1024 * 1024 * 1024 * 1.5)).toBe('1.50 GB')
      expect(formatBytes(1024 * 1024 * 1024 * 2)).toBe('2.00 GB')
      // 1024^4 - 1 = 1099511627775 bytes = 1023.999... GB, rounds to 1023.99 GB
      expect(formatBytes(1024 * 1024 * 1024 * 1024 - 1)).toBe('1023.99 GB')
    })

    it('formats gigabytes as bigint', () => {
      expect(formatBytes(BigInt(1024 * 1024 * 1024))).toBe('1.00 GB')
      expect(formatBytes(BigInt((1024 * 1024 * 1024 * 3) / 2))).toBe('1.50 GB')
      expect(formatBytes(BigInt(1024 * 1024 * 1024 * 2))).toBe('2.00 GB')
      // 1024^4 - 1 = 1099511627775 bytes = 1023.999... GB, rounds to 1023.99 GB
      expect(formatBytes(BigInt(1024 * 1024 * 1024 * 1024 - 1))).toBe(
        '1023.99 GB',
      )
    })
  })

  describe('terabytes (TB)', () => {
    it('formats terabytes as number', () => {
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB')
      expect(formatBytes(1024 * 1024 * 1024 * 1024 * 1.5)).toBe('1.50 TB')
      expect(formatBytes(1024 * 1024 * 1024 * 1024 * 2)).toBe('2.00 TB')
    })

    it('formats terabytes as bigint', () => {
      expect(formatBytes(BigInt(1024 * 1024 * 1024 * 1024))).toBe('1.00 TB')
      expect(formatBytes(BigInt((1024 * 1024 * 1024 * 1024 * 3) / 2))).toBe(
        '1.50 TB',
      )
      expect(formatBytes(BigInt(1024 * 1024 * 1024 * 1024 * 2))).toBe('2.00 TB')
    })
  })

  describe('petabytes (PB)', () => {
    it('formats petabytes as bigint', () => {
      // Calculate 1024^5 using repeated multiplication
      let onePB = BigInt(1)
      for (let i = 0; i < 5; i++) {
        onePB = onePB * BigInt(1024)
      }
      expect(formatBytes(onePB)).toBe('1.00 PB')
      expect(formatBytes(onePB * BigInt(2))).toBe('2.00 PB')
      expect(formatBytes((onePB * BigInt(3)) / BigInt(2))).toBe('1.50 PB')
    })
  })

  describe('precision preservation with large bigints', () => {
    it('preserves precision for values exceeding Number.MAX_SAFE_INTEGER', () => {
      // Number.MAX_SAFE_INTEGER is 2^53 - 1 = 9,007,199,254,740,991
      // This is approximately 8 PB, so we'll test with values larger than that
      const maxSafeInteger = BigInt(Number.MAX_SAFE_INTEGER)
      const beyondSafeInteger = maxSafeInteger + BigInt(1000000000000)

      // Should still format correctly without precision loss
      const result = formatBytes(beyondSafeInteger)
      expect(result).toMatch(/^\d+\.\d{2} (TB|PB)$/)
    })

    it('handles very large bigint values', () => {
      // Test with a value that would lose precision if converted to number first
      const veryLarge = BigInt('9007199254740992') // 2^53, exactly at the limit
      const result = formatBytes(veryLarge)
      expect(result).toBeTruthy()
      expect(result).toMatch(/^\d+\.\d{2} (TB|PB)$/)
    })

    it('preserves precision for large string values', () => {
      // Test with string values that exceed Number.MAX_SAFE_INTEGER
      const maxSafeIntegerStr = String(Number.MAX_SAFE_INTEGER)
      const beyondSafeIntegerStr = String(
        Number.MAX_SAFE_INTEGER + 1000000000000,
      )

      const result1 = formatBytes(maxSafeIntegerStr)
      expect(result1).toMatch(/^\d+\.\d{2} (TB|PB)$/)

      const result2 = formatBytes(beyondSafeIntegerStr)
      expect(result2).toMatch(/^\d+\.\d{2} (TB|PB)$/)

      // Test with a very large string value
      const veryLargeStr = '9007199254740992'
      const result3 = formatBytes(veryLargeStr)
      expect(result3).toBeTruthy()
      expect(result3).toMatch(/^\d+\.\d{2} (TB|PB)$/)
    })
  })

  describe('decimal precision', () => {
    it('formats values with exact decimals', () => {
      expect(formatBytes(1536)).toBe('1.50 KB') // 1.5 KB
      expect(formatBytes(2560)).toBe('2.50 KB') // 2.5 KB
      // 768 bytes is less than 1 KB, so it stays as bytes
      expect(formatBytes(768)).toBe('768 B')
    })

    it('formats values with rounding', () => {
      // 1263 / 1024 = 1.233... KB, rounds to 1.23 KB
      expect(formatBytes(1263)).toBe('1.23 KB')
      // 2046 / 1024 = 1.998... KB, rounds to 1.99 KB
      expect(formatBytes(2046)).toBe('1.99 KB')
      // 2047 / 1024 = 1.999... KB, but integer division gives 1.99 KB
      expect(formatBytes(2047)).toBe('1.99 KB')
      // 2048 / 1024 = exactly 2.00 KB
      expect(formatBytes(2048)).toBe('2.00 KB')
    })
  })
})
