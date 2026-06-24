import { describe, expect, it } from 'bun:test'

import {
  encodeObjectKeyPreservingSlashes,
  hasEncodedForwardSlash,
  replaceEncodedForwardSlashes,
  sanitizeUploadFilename,
} from './s3.util'

describe('sanitizeUploadFilename', () => {
  it('replaces a real "/" with "_"', () => {
    expect(sanitizeUploadFilename('a/b.txt')).toBe('a_b.txt')
  })

  it('replaces "%2F" with "_"', () => {
    expect(sanitizeUploadFilename('a%2Fb.txt')).toBe('a_b.txt')
  })

  it('replaces lowercase "%2f" with "_"', () => {
    expect(sanitizeUploadFilename('a%2fb.txt')).toBe('a_b.txt')
  })

  it('handles mixed and multiple occurrences', () => {
    expect(sanitizeUploadFilename('a%2Fb/c%2fd/e')).toBe('a_b_c_d_e')
  })

  it('is idempotent', () => {
    const once = sanitizeUploadFilename('a%2Fb/c')
    expect(sanitizeUploadFilename(once)).toBe(once)
  })

  it('leaves normal filenames untouched', () => {
    expect(sanitizeUploadFilename('report.txt')).toBe('report.txt')
  })

  it('leaves spaces, unicode, "." and "+" untouched', () => {
    expect(sanitizeUploadFilename('my file (café) v1.2+final.tar.gz')).toBe(
      'my file (café) v1.2+final.tar.gz',
    )
  })
})

describe('replaceEncodedForwardSlashes', () => {
  it('replaces "%2F" with "_"', () => {
    expect(replaceEncodedForwardSlashes('a%2Fb')).toBe('a_b')
  })

  it('replaces lowercase "%2f" with "_"', () => {
    expect(replaceEncodedForwardSlashes('a%2fb')).toBe('a_b')
  })

  it('replaces multiple occurrences', () => {
    expect(replaceEncodedForwardSlashes('a%2Fb%2fc')).toBe('a_b_c')
  })

  it('leaves real "/" untouched', () => {
    expect(replaceEncodedForwardSlashes('a/b/c')).toBe('a/b/c')
  })

  it('leaves other characters and other percent-encodings untouched', () => {
    expect(replaceEncodedForwardSlashes('a%20b%252Fc')).toBe('a%20b%252Fc')
  })

  it('is idempotent', () => {
    const once = replaceEncodedForwardSlashes('a%2Fb')
    expect(replaceEncodedForwardSlashes(once)).toBe(once)
  })
})

describe('hasEncodedForwardSlash', () => {
  it('is true for "%2F"', () => {
    expect(hasEncodedForwardSlash('a%2Fb')).toBe(true)
  })

  it('is true for lowercase "%2f"', () => {
    expect(hasEncodedForwardSlash('a%2fb')).toBe(true)
  })

  it('is false for a real "/"', () => {
    expect(hasEncodedForwardSlash('a/b')).toBe(false)
  })

  it('is false for a plain string', () => {
    expect(hasEncodedForwardSlash('ab')).toBe(false)
  })

  it('is false for a double-encoded "%252F"', () => {
    expect(hasEncodedForwardSlash('a%252Fb')).toBe(false)
  })
})

describe('encodeObjectKeyPreservingSlashes', () => {
  it('keeps real "/" separators', () => {
    expect(encodeObjectKeyPreservingSlashes('a/b/c.txt')).toBe('a/b/c.txt')
  })

  it('encodes special characters', () => {
    expect(encodeObjectKeyPreservingSlashes('a b?c')).toBe('a%20b%3Fc')
  })

  it('encodes a literal "%2F" distinctly from a real "/"', () => {
    expect(encodeObjectKeyPreservingSlashes('a%2Fb')).toBe('a%252Fb')
    expect(encodeObjectKeyPreservingSlashes('a/b')).toBe('a/b')
    expect(encodeObjectKeyPreservingSlashes('a%2Fb')).not.toBe(
      encodeObjectKeyPreservingSlashes('a/b'),
    )
  })

  it('round-trips a literal-"%2F" key via decodeURIComponent', () => {
    const key = 'a%2Fb'
    expect(decodeURIComponent(encodeObjectKeyPreservingSlashes(key))).toBe(key)
  })
})
