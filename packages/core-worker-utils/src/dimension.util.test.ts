import { describe, expect, it } from 'bun:test'

import { calculateOutputDimensions } from './dimension.util'

describe('calculateOutputDimensions', () => {
  describe('basic functionality', () => {
    it('should return original dimensions when both are within max constraint', () => {
      const result = calculateOutputDimensions({
        inputWidth: 100,
        inputHeight: 200,
        maxDimension: 300,
      })
      expect(result).toEqual({ width: 100, height: 200 })
    })

    it('should scale down when width exceeds max dimension', () => {
      const result = calculateOutputDimensions({
        inputWidth: 800,
        inputHeight: 600,
        maxDimension: 400,
      })
      expect(result).toEqual({ width: 400, height: 300 })
    })

    it('should scale down when height exceeds max dimension', () => {
      const result = calculateOutputDimensions({
        inputWidth: 600,
        inputHeight: 800,
        maxDimension: 400,
      })
      expect(result).toEqual({ width: 300, height: 400 })
    })

    it('should scale down when both dimensions exceed max dimension', () => {
      const result = calculateOutputDimensions({
        inputWidth: 1000,
        inputHeight: 800,
        maxDimension: 400,
      })
      expect(result).toEqual({ width: 400, height: 320 })
    })
  })

  describe('edge cases', () => {
    it('should handle square images correctly', () => {
      const result = calculateOutputDimensions({
        inputWidth: 500,
        inputHeight: 500,
        maxDimension: 200,
      })
      expect(result).toEqual({ width: 200, height: 200 })
    })

    it('should handle very wide images', () => {
      const result = calculateOutputDimensions({
        inputWidth: 2000,
        inputHeight: 100,
        maxDimension: 400,
      })
      expect(result).toEqual({ width: 400, height: 20 })
    })

    it('should handle very tall images', () => {
      const result = calculateOutputDimensions({
        inputWidth: 100,
        inputHeight: 2000,
        maxDimension: 400,
      })
      expect(result).toEqual({ width: 20, height: 400 })
    })

    it('should handle dimensions exactly equal to max dimension', () => {
      const result = calculateOutputDimensions({
        inputWidth: 400,
        inputHeight: 300,
        maxDimension: 400,
      })
      expect(result).toEqual({ width: 400, height: 300 })
    })

    it('should handle small input dimensions with large max dimension', () => {
      const result = calculateOutputDimensions({
        inputWidth: 50,
        inputHeight: 75,
        maxDimension: 1000,
      })
      expect(result).toEqual({ width: 50, height: 75 })
    })
  })

  describe('rounding behavior', () => {
    it('should round dimensions to nearest integer', () => {
      const result = calculateOutputDimensions({
        inputWidth: 1000,
        inputHeight: 333,
        maxDimension: 400,
      })
      expect(result).toEqual({ width: 400, height: 133 })
    })

    it('should handle fractional scaling correctly', () => {
      const result = calculateOutputDimensions({
        inputWidth: 1000,
        inputHeight: 750,
        maxDimension: 300,
      })
      expect(result).toEqual({ width: 300, height: 225 })
    })
  })

  describe('error handling', () => {
    it('should throw error for zero width', () => {
      expect(() =>
        calculateOutputDimensions({
          inputWidth: 0,
          inputHeight: 100,
          maxDimension: 200,
        }),
      ).toThrow('Input dimensions must be positive numbers')
    })

    it('should throw error for zero height', () => {
      expect(() =>
        calculateOutputDimensions({
          inputWidth: 100,
          inputHeight: 0,
          maxDimension: 200,
        }),
      ).toThrow('Input dimensions must be positive numbers')
    })

    it('should throw error for negative width', () => {
      expect(() =>
        calculateOutputDimensions({
          inputWidth: -100,
          inputHeight: 200,
          maxDimension: 300,
        }),
      ).toThrow('Input dimensions must be positive numbers')
    })

    it('should throw error for negative height', () => {
      expect(() =>
        calculateOutputDimensions({
          inputWidth: 100,
          inputHeight: -200,
          maxDimension: 300,
        }),
      ).toThrow('Input dimensions must be positive numbers')
    })

    it('should throw error for zero max dimension', () => {
      expect(() =>
        calculateOutputDimensions({
          inputWidth: 100,
          inputHeight: 200,
          maxDimension: 0,
        }),
      ).toThrow('Max dimension must be a positive number')
    })

    it('should throw error for negative max dimension', () => {
      expect(() =>
        calculateOutputDimensions({
          inputWidth: 100,
          inputHeight: 200,
          maxDimension: -100,
        }),
      ).toThrow('Max dimension must be a positive number')
    })
  })

  describe('real-world scenarios', () => {
    it('should handle common video resolutions', () => {
      // 1920x1080 scaled to max 1280
      const result = calculateOutputDimensions({
        inputWidth: 1920,
        inputHeight: 1080,
        maxDimension: 1280,
      })
      expect(result).toEqual({ width: 1280, height: 720 })
    })

    it('should handle portrait images', () => {
      // 1080x1920 scaled to max 800
      const result = calculateOutputDimensions({
        inputWidth: 1080,
        inputHeight: 1920,
        maxDimension: 800,
      })
      expect(result).toEqual({ width: 450, height: 800 })
    })

    it('should handle thumbnail generation', () => {
      // Large image scaled to thumbnail size
      const result = calculateOutputDimensions({
        inputWidth: 4000,
        inputHeight: 3000,
        maxDimension: 150,
      })
      expect(result).toEqual({ width: 150, height: 113 })
    })

    it('should handle preview generation', () => {
      // Medium image scaled to preview size
      const result = calculateOutputDimensions({
        inputWidth: 1200,
        inputHeight: 800,
        maxDimension: 600,
      })
      expect(result).toEqual({ width: 600, height: 400 })
    })
  })

  describe('aspect ratio preservation', () => {
    it('should preserve 16:9 aspect ratio', () => {
      const result = calculateOutputDimensions({
        inputWidth: 1920,
        inputHeight: 1080,
        maxDimension: 800,
      })
      const aspectRatio = result.width / result.height
      expect(aspectRatio).toBeCloseTo(16 / 9, 2)
    })

    it('should preserve 4:3 aspect ratio', () => {
      const result = calculateOutputDimensions({
        inputWidth: 800,
        inputHeight: 600,
        maxDimension: 400,
      })
      const aspectRatio = result.width / result.height
      expect(aspectRatio).toBeCloseTo(4 / 3, 2)
    })

    it('should preserve 1:1 aspect ratio', () => {
      const result = calculateOutputDimensions({
        inputWidth: 500,
        inputHeight: 500,
        maxDimension: 200,
      })
      const aspectRatio = result.width / result.height
      expect(aspectRatio).toBeCloseTo(1, 2)
    })

    it('should preserve 3:2 aspect ratio', () => {
      const result = calculateOutputDimensions({
        inputWidth: 1200,
        inputHeight: 800,
        maxDimension: 600,
      })
      const aspectRatio = result.width / result.height
      expect(aspectRatio).toBeCloseTo(3 / 2, 2)
    })
  })
})
