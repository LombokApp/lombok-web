import { describe, expect, it } from 'bun:test'

import type { OutputImageType } from './crop-image'
import {
  computeCropTransform,
  DEFAULT_COMPRESS_OPTIONS,
  encodeWithinBudget,
} from './crop-image'

function fakeBlob(type: OutputImageType, size: number): Blob {
  return { type, size } as unknown as Blob
}

describe('computeCropTransform', () => {
  it('scales a displayed crop into source pixels', () => {
    const t = computeCropTransform({
      crop: { x: 100, y: 50, width: 200, height: 200 },
      naturalWidth: 1000,
      naturalHeight: 1000,
      displayWidth: 500,
      displayHeight: 500,
    })
    expect(t.scaleX).toBe(2)
    expect(t.scaleY).toBe(2)
    expect(t.cropX).toBe(200)
    expect(t.cropY).toBe(100)
    expect(t.cropSizeNatural).toBe(400)
  })

  it('locks the crop to a square using the shorter side', () => {
    const t = computeCropTransform({
      crop: { x: 0, y: 0, width: 210, height: 200 },
      naturalWidth: 600,
      naturalHeight: 600,
      displayWidth: 600,
      displayHeight: 600,
    })
    expect(t.cropSizeNatural).toBe(200)
  })
})

describe('encodeWithinBudget', () => {
  it('returns the first quality whose blob fits the budget', async () => {
    const calls: { type: OutputImageType; quality: number; size: number }[] = []
    const blob = await encodeWithinBudget({
      outputSize: 512,
      options: DEFAULT_COMPRESS_OPTIONS,
      // Shrinks with quality; q=0.7 is the first under the 900 KB budget.
      encode: (size, type, quality) => {
        calls.push({ type, quality, size })
        return Promise.resolve(
          fakeBlob(type, Math.round(quality * 1200 * 1024)),
        )
      },
    })
    expect(blob.type).toBe('image/webp')
    expect(blob.size).toBeLessThanOrEqual(DEFAULT_COMPRESS_OPTIONS.maxBytes)
    expect(calls.map((c) => c.quality)).toEqual([0.9, 0.8, 0.7])
    expect(calls.every((c) => c.size === 512)).toBe(true)
  })

  it('falls back to JPEG when the browser ignores WebP', async () => {
    const types: OutputImageType[] = []
    const blob = await encodeWithinBudget({
      outputSize: 512,
      options: DEFAULT_COMPRESS_OPTIONS,
      // Browser always hands back JPEG regardless of the requested type.
      encode: (_size, type, _quality) => {
        types.push(type)
        return Promise.resolve(fakeBlob('image/jpeg', 100 * 1024))
      },
    })
    expect(blob.type).toBe('image/jpeg')
    // First probes WebP, detects the mismatch, then re-encodes as JPEG.
    expect(types).toEqual(['image/webp', 'image/jpeg'])
  })

  it('shrinks the output size when the quality ladder is exhausted', async () => {
    const sizes = new Set<number>()
    const blob = await encodeWithinBudget({
      outputSize: 512,
      options: DEFAULT_COMPRESS_OPTIONS,
      // Bytes scale with area; only a smaller canvas fits the budget.
      encode: (size, type, quality) => {
        sizes.add(size)
        const bytes = size * size * quality * 8
        return Promise.resolve(fakeBlob(type, Math.round(bytes)))
      },
    })
    expect(blob.size).toBeLessThanOrEqual(DEFAULT_COMPRESS_OPTIONS.maxBytes)
    expect(Math.max(...sizes)).toBe(512)
    expect(Math.min(...sizes)).toBeLessThan(512)
  })

  it('throws when nothing fits even at the floor size', async () => {
    let threw = false
    try {
      await encodeWithinBudget({
        outputSize: 512,
        options: DEFAULT_COMPRESS_OPTIONS,
        encode: (_size, type) =>
          Promise.resolve(fakeBlob(type, 5 * 1024 * 1024)),
      })
    } catch {
      threw = true
    }
    expect(threw).toBe(true)
  })
})
