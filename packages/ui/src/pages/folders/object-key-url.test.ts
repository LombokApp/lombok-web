import { encodeObjectKeyPreservingSlashes } from '@lombokapp/utils'
import { describe, expect, it } from 'bun:test'

import { recoverObjectKey } from './object-key-url'

describe('recoverObjectKey', () => {
  it('recovers a real-slash multi-segment key', () => {
    expect(recoverObjectKey('/folders/FID/objects/videos/clip-4.mp4')).toBe(
      'videos/clip-4.mp4',
    )
  })

  it('recovers a literal-"%2F" key (single decode of "%252F")', () => {
    expect(recoverObjectKey('/folders/FID/objects/a%252Fb')).toBe('a%2Fb')
  })

  it('returns undefined for a non-object route', () => {
    expect(recoverObjectKey('/folders/FID/tasks/abc')).toBeUndefined()
    expect(recoverObjectKey('/folders/FID')).toBeUndefined()
  })

  it('does not throw on a malformed percent-encoding', () => {
    expect(recoverObjectKey('/folders/FID/objects/a%2')).toBe('a%2')
  })

  it('is the inverse of encodeObjectKeyPreservingSlashes', () => {
    for (const key of [
      'simple.txt',
      'videos/clip-4.mp4',
      'a%2Fb',
      'with space & symbols?.png',
    ]) {
      expect(
        recoverObjectKey(
          `/folders/FID/objects/${encodeObjectKeyPreservingSlashes(key)}`,
        ),
      ).toBe(key)
    }
  })
})
