import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { v4 as uuidV4 } from 'uuid'

import {
  generateVideoPreviews,
  getMediaDimensionsWithFFMpeg,
  VideoPreviewVariant,
} from './ffmpeg.util'

describe('generateVideoPreviews', () => {
  let testVideoShortPath: string
  let testVideoTvPath: string
  let testVideoVeryShortPath: string
  let testOutputDir: string
  const cleanupPaths: string[] = []

  // eslint-disable-next-line @typescript-eslint/require-await
  beforeAll(async () => {
    // Create test output directory
    testOutputDir = path.join(os.tmpdir(), `ffmpeg-test-${uuidV4()}`)
    fs.mkdirSync(testOutputDir, { recursive: true })
    cleanupPaths.push(testOutputDir)

    // Set up paths to our test video files
    const fixturesDir = path.join(__dirname, '__tests__', 'fixtures')
    testVideoShortPath = path.join(fixturesDir, 'sample-short.mp4')
    testVideoTvPath = path.join(fixturesDir, 'sample-tv.mp4')
    testVideoVeryShortPath = path.join(fixturesDir, 'sample-very-short.mp4')

    // Verify test files exist
    if (!fs.existsSync(testVideoShortPath)) {
      throw new Error(`Test video file not found: ${testVideoShortPath}`)
    }
    if (!fs.existsSync(testVideoTvPath)) {
      throw new Error(`Test video file not found: ${testVideoTvPath}`)
    }
    if (!fs.existsSync(testVideoVeryShortPath)) {
      throw new Error(`Test video file not found: ${testVideoVeryShortPath}`)
    }
  })

  afterAll(() => {
    // Cleanup all test files and directories
    cleanupPaths.forEach((cleanupPath) => {
      if (fs.existsSync(cleanupPath)) {
        if (fs.statSync(cleanupPath).isDirectory()) {
          fs.rmSync(cleanupPath, { recursive: true, force: true })
        } else {
          fs.unlinkSync(cleanupPath)
        }
      }
    })
  })

  describe('SHORT_FORM variant', () => {
    it('should generate preview and thumbnail for very short video', async () => {
      const outputDir = path.join(testOutputDir, 'short-form-test')
      fs.mkdirSync(outputDir, { recursive: true })
      cleanupPaths.push(outputDir)

      // Get video dimensions
      const dimensions = await getMediaDimensionsWithFFMpeg(
        testVideoVeryShortPath,
      )

      const result = await generateVideoPreviews({
        inFilePath: testVideoVeryShortPath,
        outFileDirectory: outputDir,
        variant: VideoPreviewVariant.SHORT_FORM,
        dimensions,
      })

      // Should generate both preview and thumbnail
      expect(Object.keys(result)).toHaveLength(2)

      // Check that we have both preview and thumbnail entries
      const previewEntries = Object.values(result)
      const previewEntry = previewEntries.find((p) => p.purpose === 'detail')
      const thumbnailEntry = previewEntries.find((p) => p.purpose === 'list')

      expect(previewEntry).toBeDefined()
      expect(thumbnailEntry).toBeDefined()

      // Verify preview metadata
      expect(previewEntry?.profile).toBe('preview')
      expect(previewEntry?.label).toBe('Preview')
      expect(previewEntry?.mimeType).toBe('image/webp')
      expect(previewEntry?.dimensions.width).toBeGreaterThan(0)
      expect(previewEntry?.dimensions.height).toBeGreaterThan(0)
      expect(previewEntry?.sizeBytes).toBeGreaterThan(0)
      expect(previewEntry?.hash).toBeTruthy()

      // Verify thumbnail metadata
      expect(thumbnailEntry?.profile).toBe('thumbnail')
      expect(thumbnailEntry?.label).toBe('Thumbnail')
      expect(thumbnailEntry?.mimeType).toBe('image/webp')
      expect(thumbnailEntry?.dimensions.width).toBeGreaterThan(0)
      expect(thumbnailEntry?.dimensions.height).toBeGreaterThan(0)
      expect(thumbnailEntry?.sizeBytes).toBeGreaterThan(0)
      expect(thumbnailEntry?.hash).toBeTruthy()

      // Verify files were created
      const previewFile = path.join(outputDir, previewEntry?.hash ?? '')
      const thumbnailFile = path.join(outputDir, thumbnailEntry?.hash ?? '')
      expect(fs.existsSync(previewFile)).toBe(true)
      expect(fs.existsSync(thumbnailFile)).toBe(true)
    })

    it('should generate preview and thumbnail for regular short video', async () => {
      const outputDir = path.join(testOutputDir, 'short-form-regular-test')
      fs.mkdirSync(outputDir, { recursive: true })
      cleanupPaths.push(outputDir)

      // Get video dimensions
      const dimensions = await getMediaDimensionsWithFFMpeg(testVideoShortPath)
      const result = await generateVideoPreviews({
        inFilePath: testVideoShortPath,
        outFileDirectory: outputDir,
        variant: VideoPreviewVariant.SHORT_FORM,
        dimensions,
      })

      // Should generate both preview and thumbnail
      expect(Object.keys(result)).toHaveLength(2)

      const previewEntries = Object.values(result)
      const previewEntry = previewEntries.find((p) => p.purpose === 'detail')
      const thumbnailEntry = previewEntries.find((p) => p.purpose === 'list')

      expect(previewEntry).toBeDefined()
      expect(thumbnailEntry).toBeDefined()

      // Verify files were created
      const previewFile = path.join(outputDir, previewEntry?.hash ?? '')
      const thumbnailFile = path.join(outputDir, thumbnailEntry?.hash ?? '')
      expect(fs.existsSync(previewFile)).toBe(true)
      expect(fs.existsSync(thumbnailFile)).toBe(true)
    })
  })

  describe('TV_MOVIE variant', () => {
    it('should generate preview and thumbnail for TV/movie content', async () => {
      const outputDir = path.join(testOutputDir, 'tv-movie-test')
      fs.mkdirSync(outputDir, { recursive: true })
      cleanupPaths.push(outputDir)

      // Get video dimensions
      const dimensions = await getMediaDimensionsWithFFMpeg(testVideoTvPath)

      const result = await generateVideoPreviews({
        inFilePath: testVideoTvPath,
        outFileDirectory: outputDir,
        variant: VideoPreviewVariant.TV_MOVIE,
        dimensions,
      })

      // Should generate both preview and thumbnail
      expect(Object.keys(result)).toHaveLength(2)

      const previewEntries = Object.values(result)
      const previewEntry = previewEntries.find((p) => p.purpose === 'detail')
      const thumbnailEntry = previewEntries.find((p) => p.purpose === 'list')

      expect(previewEntry).toBeDefined()
      expect(thumbnailEntry).toBeDefined()

      // Verify preview metadata
      expect(previewEntry?.profile).toBe('preview')
      expect(previewEntry?.label).toBe('Preview')
      expect(previewEntry?.mimeType).toBe('image/webp')
      expect(previewEntry?.dimensions.width).toBeGreaterThan(0)
      expect(previewEntry?.dimensions.height).toBeGreaterThan(0)
      expect(previewEntry?.sizeBytes).toBeGreaterThan(0)
      expect(previewEntry?.hash).toBeTruthy()

      // Verify thumbnail metadata
      expect(thumbnailEntry?.profile).toBe('thumbnail')
      expect(thumbnailEntry?.label).toBe('Thumbnail')
      expect(thumbnailEntry?.mimeType).toBe('image/webp')
      expect(thumbnailEntry?.dimensions.width).toBeGreaterThan(0)
      expect(thumbnailEntry?.dimensions.height).toBeGreaterThan(0)
      expect(thumbnailEntry?.sizeBytes).toBeGreaterThan(0)
      expect(thumbnailEntry?.hash).toBeTruthy()

      // Verify files were created
      const previewFile = path.join(outputDir, previewEntry?.hash ?? '')
      const thumbnailFile = path.join(outputDir, thumbnailEntry?.hash ?? '')
      expect(fs.existsSync(previewFile)).toBe(true)
      expect(fs.existsSync(thumbnailFile)).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle non-existent input file', () => {
      const nonExistentPath = path.join(testOutputDir, 'non-existent.mp4')

      expect(
        generateVideoPreviews({
          inFilePath: nonExistentPath,
          outFileDirectory: testOutputDir,
          variant: VideoPreviewVariant.SHORT_FORM,
          dimensions: { width: 1920, height: 1080, durationMs: 30000 },
        }),
      ).rejects.toThrow()
    })

    it('should handle invalid output directory', () => {
      const invalidOutputDir = '/invalid/path/that/does/not/exist'

      expect(
        generateVideoPreviews({
          inFilePath: testVideoVeryShortPath,
          outFileDirectory: invalidOutputDir,
          variant: VideoPreviewVariant.SHORT_FORM,
          dimensions: { width: 1920, height: 1080, durationMs: 5000 },
        }),
      ).rejects.toThrow()
    })

    it('should handle zero dimensions gracefully', () => {
      const outputDir = path.join(testOutputDir, 'zero-dimensions-test')
      fs.mkdirSync(outputDir, { recursive: true })
      cleanupPaths.push(outputDir)

      // Zero dimensions should throw an error as it's invalid input
      expect(
        generateVideoPreviews({
          inFilePath: testVideoVeryShortPath,
          outFileDirectory: outputDir,
          variant: VideoPreviewVariant.SHORT_FORM,
          dimensions: { width: 0, height: 0, durationMs: 0 },
        }),
      ).rejects.toThrow()
    })
  })
})
