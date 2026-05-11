import { describe, expect, it } from 'bun:test'
import { z } from 'zod'

import { flattenZodIssues, summariseZodError } from './format-zod-issues'

describe('flattenZodIssues', () => {
  it('returns one entry per leaf with a dot-joined path', () => {
    const schema = z.object({
      label: z.string(),
      nested: z.object({ count: z.number() }),
    })
    const result = schema.safeParse({ label: 42, nested: { count: 'no' } })
    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    const flat = flattenZodIssues(result.error.issues)
    const paths = flat.map((f) => f.path).sort()
    expect(paths).toEqual(['label', 'nested.count'])
    expect(flat.every((f) => f.message.length > 0)).toBe(true)
  })

  it('flattens discriminated-union mismatches to the deepest matching variant', () => {
    const schema = z.object({
      auth: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('api_key'), api_key: z.string() }),
        z.object({
          kind: z.literal('oauth'),
          status: z.enum(['pending', 'active']),
        }),
      ]),
    })
    // Discriminator picks the oauth branch but `status` is wrong.
    const result = schema.safeParse({
      auth: { kind: 'oauth', status: 'unknown' },
    })
    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    const flat = flattenZodIssues(result.error.issues)
    // The deepest leaf carries the actual problem, not a wall of "expected
    // 'api_key' / expected 'oauth'" alternatives.
    expect(flat.length).toBeGreaterThan(0)
    const leaf = flat.find((f) => f.path.endsWith('status'))
    expect(leaf).toBeDefined()
  })

  it('handles array index paths', () => {
    const schema = z.object({
      tags: z.array(z.string()),
    })
    const result = schema.safeParse({ tags: ['ok', 42, 'also-ok'] })
    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    const flat = flattenZodIssues(result.error.issues)
    expect(flat[0]?.path).toBe('tags[1]')
  })

  it('handles top-level (path-less) issues', () => {
    const schema = z.string().min(3)
    const result = schema.safeParse('a')
    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    const flat = flattenZodIssues(result.error.issues)
    expect(flat).toHaveLength(1)
    expect(flat[0]?.path).toBe('')
  })
})

describe('summariseZodError', () => {
  it('produces a multi-line bullet summary one entry per leaf', () => {
    const schema = z.object({
      label: z.string(),
      count: z.number(),
    })
    const result = schema.safeParse({ label: 1, count: 'no' })
    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    const summary = summariseZodError(result.error)
    expect(summary.split('\n').length).toBe(2)
    expect(summary).toContain('label')
    expect(summary).toContain('count')
    expect(summary.startsWith('  • ')).toBe(true)
  })
})
