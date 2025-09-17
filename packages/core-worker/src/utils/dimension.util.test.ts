import { describe, expect, it } from 'bun:test'

import { calculateOutputDimensions } from './dimension.util'

describe('calculateOutputDimensions', () => {
  describe('basic functionality', () => {
    it('should return original dimensions when both are within max constraint', () => {
      const result = calculateOutputDimensions(100, 200, 300)
      expect(result).toEqual({ width: 100, height: 200 })
    })

    it('should scale down when width exceeds max dimension', () => {
      const result = calculateOutputDimensions(800, 600, 400)
      expect(result).toEqual({ width: 400, height: 300 })
    })

    it('should scale down when height exceeds max dimension', () => {
      const result = calculateOutputDimensions(600, 800, 400)
      expect(result).toEqual({ width: 300, height: 400 })
    })

    it('should scale down when both dimensions exceed max dimension', () => {
      const result = calculateOutputDimensions(1000, 800, 400)
      expect(result).toEqual({ width: 400, height: 320 })
    })
  })

  describe('edge cases', () => {
    it('should handle square images correctly', () => {
      const result = calculateOutputDimensions(500, 500, 200)
      expect(result).toEqual({ width: 200, height: 200 })
    })

    it('should handle very wide images', () => {
      const result = calculateOutputDimensions(2000, 100, 400)
      expect(result).toEqual({ width: 400, height: 20 })
    })

    it('should handle very tall images', () => {
      const result = calculateOutputDimensions(100, 2000, 400)
      expect(result).toEqual({ width: 20, height: 400 })
    })

    it('should handle dimensions exactly equal to max dimension', () => {
      const result = calculateOutputDimensions(400, 300, 400)
      expect(result).toEqual({ width: 400, height: 300 })
    })

    it('should handle small input dimensions with large max dimension', () => {
      const result = calculateOutputDimensions(50, 75, 1000)
      expect(result).toEqual({ width: 50, height: 75 })
    })
  })

  describe('rounding behavior', () => {
    it('should round dimensions to nearest integer', () => {
      const result = calculateOutputDimensions(1000, 333, 400)
      expect(result).toEqual({ width: 400, height: 133 })
    })

    it('should handle fractional scaling correctly', () => {
      const result = calculateOutputDimensions(1000, 750, 300)
      expect(result).toEqual({ width: 300, height: 225 })
    })
  })

  describe('error handling', () => {
    it('should throw error for zero width', () => {
      expect(() => calculateOutputDimensions(0, 100, 200)).toThrow(
        'Input dimensions must be positive numbers',
      )
    })

    it('should throw error for zero height', () => {
      expect(() => calculateOutputDimensions(100, 0, 200)).toThrow(
        'Input dimensions must be positive numbers',
      )
    })

    it('should throw error for negative width', () => {
      expect(() => calculateOutputDimensions(-100, 200, 300)).toThrow(
        'Input dimensions must be positive numbers',
      )
    })

    it('should throw error for negative height', () => {
      expect(() => calculateOutputDimensions(100, -200, 300)).toThrow(
        'Input dimensions must be positive numbers',
      )
    })

    it('should throw error for zero max dimension', () => {
      expect(() => calculateOutputDimensions(100, 200, 0)).toThrow(
        'Max dimension must be a positive number',
      )
    })

    it('should throw error for negative max dimension', () => {
      expect(() => calculateOutputDimensions(100, 200, -100)).toThrow(
        'Max dimension must be a positive number',
      )
    })
  })

  describe('real-world scenarios', () => {
    it('should handle common video resolutions', () => {
      // 1920x1080 scaled to max 1280
      const result = calculateOutputDimensions(1920, 1080, 1280)
      expect(result).toEqual({ width: 1280, height: 720 })
    })

    it('should handle portrait images', () => {
      // 1080x1920 scaled to max 800
      const result = calculateOutputDimensions(1080, 1920, 800)
      expect(result).toEqual({ width: 450, height: 800 })
    })

    it('should handle thumbnail generation', () => {
      // Large image scaled to thumbnail size
      const result = calculateOutputDimensions(4000, 3000, 150)
      expect(result).toEqual({ width: 150, height: 113 })
    })

    it('should handle preview generation', () => {
      // Medium image scaled to preview size
      const result = calculateOutputDimensions(1200, 800, 600)
      expect(result).toEqual({ width: 600, height: 400 })
    })
  })

  describe('aspect ratio preservation', () => {
    it('should preserve 16:9 aspect ratio', () => {
      const result = calculateOutputDimensions(1920, 1080, 800)
      const aspectRatio = result.width / result.height
      expect(aspectRatio).toBeCloseTo(16 / 9, 2)
    })

    it('should preserve 4:3 aspect ratio', () => {
      const result = calculateOutputDimensions(800, 600, 400)
      const aspectRatio = result.width / result.height
      expect(aspectRatio).toBeCloseTo(4 / 3, 2)
    })

    it('should preserve 1:1 aspect ratio', () => {
      const result = calculateOutputDimensions(500, 500, 200)
      const aspectRatio = result.width / result.height
      expect(aspectRatio).toBeCloseTo(1, 2)
    })

    it('should preserve 3:2 aspect ratio', () => {
      const result = calculateOutputDimensions(1200, 800, 600)
      const aspectRatio = result.width / result.height
      expect(aspectRatio).toBeCloseTo(3 / 2, 2)
    })
  })
})
