import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import sharp from 'sharp'
import { v4 as uuidV4 } from 'uuid'

import { getMediaDimensionsWithSharp, scaleImage } from './image.util'

describe('image.util scaleImage', () => {
  let tempDir: string
  const cleanupPaths: string[] = []
  let inputSquarePng: string
  let inputWidePng: string

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), `image-util-test-${uuidV4()}`)
    fs.mkdirSync(tempDir, { recursive: true })
    cleanupPaths.push(tempDir)

    // Create a 1000x1000 PNG (square)
    inputSquarePng = path.join(tempDir, 'square-1000.png')
    await sharp({
      create: {
        width: 1000,
        height: 1000,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toFile(inputSquarePng)

    // Create a 1600x900 PNG (16:9)
    inputWidePng = path.join(tempDir, 'wide-1600x900.png')
    await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 },
      },
    })
      .png()
      .toFile(inputWidePng)
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

  it('getMediaDimensionsWithSharp returns correct dimensions', async () => {
    const dimsSquare = await getMediaDimensionsWithSharp(inputSquarePng)
    expect(dimsSquare.width).toBe(1000)
    expect(dimsSquare.height).toBe(1000)

    const dimsWide = await getMediaDimensionsWithSharp(inputWidePng)
    expect(dimsWide.width).toBe(1600)
    expect(dimsWide.height).toBe(900)
  })

  it('scales within maxDimension while preserving aspect ratio', async () => {
    const outPath = path.join(tempDir, `out-max-${uuidV4()}.png`)
    cleanupPaths.push(outPath)

    const result = await scaleImage({
      inFilePath: inputWidePng,
      outFilePath: outPath,
      size: { strategy: 'max', maxDimension: 512 },
      rotation: 0,
      mimeType: 'image/png',
    })

    expect(fs.existsSync(outPath)).toBe(true)
    // 1600x900 fits into 512 -> width should be 512, height should scale to 288
    expect(result.width).toBe(512)
    expect(result.height).toBe(288)

    const outDims = await getMediaDimensionsWithSharp(outPath)
    expect(outDims.width).toBe(512)
    expect(outDims.height).toBe(288)
  }, 20000)

  it('does not upscale when maxDimension is larger than image', async () => {
    const outPath = path.join(tempDir, `out-no-upscale-${uuidV4()}.png`)
    cleanupPaths.push(outPath)

    const result = await scaleImage({
      inFilePath: inputSquarePng,
      outFilePath: outPath,
      size: { strategy: 'max', maxDimension: 2000 },
      rotation: 0,
      mimeType: 'image/png',
    })

    expect(fs.existsSync(outPath)).toBe(true)
    // Should remain original size (1000x1000)
    expect(result.width).toBe(1000)
    expect(result.height).toBe(1000)

    const outDims = await getMediaDimensionsWithSharp(outPath)
    expect(outDims.width).toBe(1000)
    expect(outDims.height).toBe(1000)

    // Validate additional metadata is present
    expect(result.originalWidth).toBe(1000)
    expect(result.originalHeight).toBe(1000)
    expect(typeof result.hash).toBe('string')
    expect(result.hash.length).toBeGreaterThan(0)
  }, 20000)

  it('resizes to exact size using cover (center crop)', async () => {
    const outPath = path.join(tempDir, `out-cover-${uuidV4()}.png`)
    cleanupPaths.push(outPath)

    const result = await scaleImage({
      inFilePath: inputWidePng,
      outFilePath: outPath,
      size: { strategy: 'exact', width: 800, height: 600, mode: 'cover' },
      rotation: 0,
      mimeType: 'image/png',
    })

    expect(fs.existsSync(outPath)).toBe(true)
    expect(result.width).toBe(800)
    expect(result.height).toBe(600)

    const outDims = await getMediaDimensionsWithSharp(outPath)
    expect(outDims.width).toBe(800)
    expect(outDims.height).toBe(600)
  }, 20000)

  it('resizes to exact size using contain (letterbox, transparent fill)', async () => {
    const outPath = path.join(tempDir, `out-contain-${uuidV4()}.png`)
    cleanupPaths.push(outPath)

    const result = await scaleImage({
      inFilePath: inputSquarePng,
      outFilePath: outPath,
      size: { strategy: 'exact', width: 800, height: 600, mode: 'contain' },
      rotation: 0,
      mimeType: 'image/png',
    })

    expect(fs.existsSync(outPath)).toBe(true)
    expect(result.width).toBe(800)
    expect(result.height).toBe(600)

    const outDims = await getMediaDimensionsWithSharp(outPath)
    expect(outDims.width).toBe(800)
    expect(outDims.height).toBe(600)
  }, 20000)

  it('throws on invalid size inputs', async () => {
    const outPath = path.join(tempDir, `out-invalid-${uuidV4()}.png`)
    cleanupPaths.push(outPath)

    // eslint-disable-next-line @typescript-eslint/await-thenable, @typescript-eslint/no-confusing-void-expression
    await expect(
      scaleImage({
        inFilePath: inputWidePng,
        outFilePath: outPath,
        size: { strategy: 'max', maxDimension: 0 },
        rotation: 0,
        mimeType: 'image/png',
      }),
    ).rejects.toThrow()

    // eslint-disable-next-line @typescript-eslint/await-thenable, @typescript-eslint/no-confusing-void-expression
    await expect(
      scaleImage({
        inFilePath: inputWidePng,
        outFilePath: outPath,
        size: { strategy: 'exact', width: 0, height: -1, mode: 'cover' },
        rotation: 0,
        mimeType: 'image/png',
      }),
    ).rejects.toThrow()
  })
})
