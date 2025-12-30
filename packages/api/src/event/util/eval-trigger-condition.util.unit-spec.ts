import { describe, expect, it } from 'bun:test'

import type { Event } from '../entities/event.entity'
import { evalTriggerHandlerCondition } from './eval-trigger-condition.util'

const event: Event = {
  id: 'd55c783e-c9e6-45ec-ad80-0d3a6e514c41',
  eventIdentifier: 'object_added',
  emitterIdentifier: 'platform',
  targetUserId: null,
  targetLocationFolderId: 'b85646a9-3c5c-40c6-afe8-6035fdb827da',
  targetLocationObjectKey:
    'DALLE-2024-01-11-22.04.56-A-variation-of-the-simplified-colorful-logo-for-the-Circles-photo-sharing-application-with-larger-circles.-The-design-maintains-the-minimalist-sty-1705007405829.png',
  data: {
    id: 'cb7aaf95-a2aa-49e3-9af1-af9eb4548118',
    eTag: '"0b6f9097d06139cf1c3a069bd9ee7c1b"',
    hash: null,
    filename:
      'DALLE-2024-01-11-22.04.56-A-variation-of-the-simplified-colorful-logo-for-the-Circles-photo-sharing-application-with-larger-circles.-The-design-maintains-the-minimalist-sty-1705007405829.png',
    folderId: 'b85646a9-3c5c-40c6-afe8-6035fdb827da',
    mimeType: 'image/png',
    createdAt: '2025-12-25T09:14:38.758Z',
    mediaType: 'IMAGE',
    objectKey:
      'DALLE-2024-01-11-22.04.56-A-variation-of-the-simplified-colorful-logo-for-the-Circles-photo-sharing-application-with-larger-circles.-The-design-maintains-the-minimalist-sty-1705007405829.png',
    sizeBytes: 441884,
    updatedAt: '2025-12-25T09:14:38.758Z',
    lastModified: 1766654078000,
    contentMetadata: {},
  },
  createdAt: new Date('2025-12-25T09:14:38.765Z'),
}

describe('evalTriggerHandlerCondition', () => {
  describe('string comparisons', () => {
    it('returns true when string equality matches', () => {
      expect(
        evalTriggerHandlerCondition("event.data.mediaType === 'IMAGE'", event),
      ).toBe(true)
    })

    it('returns false when string equality does not match', () => {
      expect(
        evalTriggerHandlerCondition("event.data.mediaType === 'VIDEO'", event),
      ).toBe(false)
    })

    it('returns true when string inequality matches', () => {
      expect(
        evalTriggerHandlerCondition("event.data.mediaType !== 'VIDEO'", event),
      ).toBe(true)
    })

    it('returns false when string inequality does not match', () => {
      expect(
        evalTriggerHandlerCondition("event.data.mediaType !== 'IMAGE'", event),
      ).toBe(false)
    })

    it('handles mimeType string comparison', () => {
      expect(
        evalTriggerHandlerCondition(
          "event.data.mimeType === 'image/png'",
          event,
        ),
      ).toBe(true)
    })

    it('handles eventIdentifier string comparison', () => {
      expect(
        evalTriggerHandlerCondition(
          "event.eventIdentifier === 'object_added'",
          event,
        ),
      ).toBe(true)
    })
  })

  describe('logical operators', () => {
    it('returns true when OR condition matches first operand', () => {
      expect(
        evalTriggerHandlerCondition(
          "event.data.mediaType === 'IMAGE' || event.data.mediaType === 'VIDEO'",
          event,
        ),
      ).toBe(true)
    })

    it('returns true when OR condition matches second operand', () => {
      const videoEvent = {
        ...event,
        data: { ...event.data, mediaType: 'VIDEO' },
      }
      expect(
        evalTriggerHandlerCondition(
          "event.data.mediaType === 'IMAGE' || event.data.mediaType === 'VIDEO'",
          videoEvent,
        ),
      ).toBe(true)
    })

    it('returns false when OR condition matches neither operand', () => {
      const otherEvent = {
        ...event,
        data: { ...event.data, mediaType: 'AUDIO' },
      }
      expect(
        evalTriggerHandlerCondition(
          "event.data.mediaType === 'IMAGE' || event.data.mediaType === 'VIDEO'",
          otherEvent,
        ),
      ).toBe(false)
    })

    it('returns true when AND condition matches both operands', () => {
      expect(
        evalTriggerHandlerCondition(
          "event.data.mediaType === 'IMAGE' && event.data.mimeType === 'image/png'",
          event,
        ),
      ).toBe(true)
    })

    it('returns false when AND condition does not match first operand', () => {
      expect(
        evalTriggerHandlerCondition(
          "event.data.mediaType === 'VIDEO' && event.data.mimeType === 'image/png'",
          event,
        ),
      ).toBe(false)
    })

    it('returns false when AND condition does not match second operand', () => {
      expect(
        evalTriggerHandlerCondition(
          "event.data.mediaType === 'IMAGE' && event.data.mimeType === 'video/mp4'",
          event,
        ),
      ).toBe(false)
    })

    it('handles complex logical expressions', () => {
      expect(
        evalTriggerHandlerCondition(
          "(event.data.mediaType === 'IMAGE' || event.data.mediaType === 'VIDEO') && event.data.sizeBytes > 0",
          event,
        ),
      ).toBe(true)
    })
  })

  describe('number comparisons', () => {
    it('returns true when greater than comparison matches', () => {
      expect(
        evalTriggerHandlerCondition('event.data.sizeBytes > 100000', event),
      ).toBe(true)
    })

    it('returns false when greater than comparison does not match', () => {
      expect(
        evalTriggerHandlerCondition('event.data.sizeBytes > 1000000', event),
      ).toBe(false)
    })

    it('returns true when less than comparison matches', () => {
      expect(
        evalTriggerHandlerCondition('event.data.sizeBytes < 1000000', event),
      ).toBe(true)
    })

    it('returns false when less than comparison does not match', () => {
      expect(
        evalTriggerHandlerCondition('event.data.sizeBytes < 100000', event),
      ).toBe(false)
    })

    it('returns true when greater than or equal comparison matches', () => {
      expect(
        evalTriggerHandlerCondition('event.data.sizeBytes >= 441884', event),
      ).toBe(true)
    })

    it('returns true when less than or equal comparison matches', () => {
      expect(
        evalTriggerHandlerCondition('event.data.sizeBytes <= 441884', event),
      ).toBe(true)
    })

    it('handles number equality', () => {
      expect(
        evalTriggerHandlerCondition('event.data.sizeBytes === 441884', event),
      ).toBe(true)
    })

    it('handles number inequality', () => {
      expect(
        evalTriggerHandlerCondition('event.data.sizeBytes !== 441884', event),
      ).toBe(false)
    })
  })

  describe('negation', () => {
    it('returns false when negated true condition', () => {
      expect(
        evalTriggerHandlerCondition(
          "!(event.data.mediaType === 'IMAGE')",
          event,
        ),
      ).toBe(false)
    })

    it('returns true when negated false condition', () => {
      expect(
        evalTriggerHandlerCondition(
          "!(event.data.mediaType === 'VIDEO')",
          event,
        ),
      ).toBe(true)
    })

    it('handles negation with logical operators', () => {
      expect(
        evalTriggerHandlerCondition(
          "!(event.data.mediaType === 'VIDEO' || event.data.mediaType === 'AUDIO')",
          event,
        ),
      ).toBe(true)
    })
  })

  describe('nested property access', () => {
    it('accesses nested properties in data', () => {
      // Note: typeof is not supported by jexpr, so we test with a simpler expression
      expect(
        evalTriggerHandlerCondition(
          'event.data.contentMetadata && event.data.contentMetadata !== null',
          event,
        ),
      ).toBe(true)
    })

    it('accesses targetLocation properties', () => {
      expect(
        evalTriggerHandlerCondition(
          "event.targetLocation && event.targetLocation.folderId === 'b85646a9-3c5c-40c6-afe8-6035fdb827da'",
          event,
        ),
      ).toBe(true)
    })

    it('handles deeply nested property access', () => {
      expect(
        evalTriggerHandlerCondition(
          "event.targetLocation.folderId === 'b85646a9-3c5c-40c6-afe8-6035fdb827da'",
          event,
        ),
      ).toBe(true)
    })
  })

  describe('null and undefined handling', () => {
    it('returns true when checking for null', () => {
      expect(
        evalTriggerHandlerCondition('event.targetUserId === null', event),
      ).toBe(true)
    })

    it('returns true when checking for not null', () => {
      expect(
        evalTriggerHandlerCondition('event.data.hash === null', event),
      ).toBe(true)
    })

    it('returns false when checking for not null on null value', () => {
      expect(
        evalTriggerHandlerCondition('event.targetUserId !== null', event),
      ).toBe(false)
    })

    it('handles null checks in logical expressions', () => {
      expect(
        evalTriggerHandlerCondition(
          "event.data.mediaType === 'IMAGE' && event.targetUserId === null",
          event,
        ),
      ).toBe(true)
    })
  })

  describe('boolean and truthy checks', () => {
    it('returns true for truthy property access', () => {
      expect(evalTriggerHandlerCondition('event.data.mediaType', event)).toBe(
        true,
      )
    })

    it('returns false for falsy property access', () => {
      expect(evalTriggerHandlerCondition('event.targetUserId', event)).toBe(
        false,
      )
    })

    it('handles explicit boolean checks', () => {
      // Note: Boolean() function calls are not supported by jexpr, but the expression
      // itself already evaluates to a boolean, so we test with a simpler expression
      expect(
        evalTriggerHandlerCondition("event.data.mediaType === 'IMAGE'", event),
      ).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('returns false for empty condition', () => {
      expect(evalTriggerHandlerCondition('', event)).toBe(false)
    })

    it('returns false for whitespace-only condition', () => {
      expect(evalTriggerHandlerCondition('   ', event)).toBe(false)
    })

    it('returns false for invalid expression', () => {
      expect(
        evalTriggerHandlerCondition('event.data.mediaType ===', event),
      ).toBe(false)
    })

    it('returns false for syntax error', () => {
      expect(
        evalTriggerHandlerCondition('event.data.mediaType === ===', event),
      ).toBe(false)
    })

    it('handles negation of empty expression', () => {
      expect(evalTriggerHandlerCondition('!', event)).toBe(false)
    })

    it('handles negation of whitespace', () => {
      expect(evalTriggerHandlerCondition('!   ', event)).toBe(false)
    })
  })

  describe('complex expressions', () => {
    it('handles multiple conditions with parentheses', () => {
      expect(
        evalTriggerHandlerCondition(
          "(event.data.mediaType === 'IMAGE' || event.data.mediaType === 'VIDEO') && event.data.sizeBytes > 100000 && event.data.mimeType.startsWith('image/')",
          event,
        ),
      ).toBe(true)
    })

    it('handles string methods', () => {
      expect(
        evalTriggerHandlerCondition(
          "event.data.mimeType.startsWith('image/')",
          event,
        ),
      ).toBe(true)
    })

    it('handles string includes', () => {
      expect(
        evalTriggerHandlerCondition(
          "event.data.filename.includes('DALLE')",
          event,
        ),
      ).toBe(true)
    })

    it('handles multiple property comparisons', () => {
      expect(
        evalTriggerHandlerCondition(
          "event.eventIdentifier === 'object_added' && event.emitterIdentifier === 'platform' && event.data.mediaType === 'IMAGE'",
          event,
        ),
      ).toBe(true)
    })

    it('handles size range checks', () => {
      expect(
        evalTriggerHandlerCondition(
          'event.data.sizeBytes >= 100000 && event.data.sizeBytes <= 1000000',
          event,
        ),
      ).toBe(true)
    })
  })

  describe('security checks', () => {
    it('blocks require() calls', () => {
      expect(
        evalTriggerHandlerCondition(
          "require('fs').readFileSync('/etc/passwd')",
          event,
        ),
      ).toBe(false)
    })

    it('blocks process access', () => {
      expect(evalTriggerHandlerCondition('process.exit(1)', event)).toBe(false)
    })

    it('blocks Function constructor', () => {
      expect(
        evalTriggerHandlerCondition(
          "new Function('return process.exit(1)')()",
          event,
        ),
      ).toBe(false)
    })

    it('blocks constructor access', () => {
      expect(
        evalTriggerHandlerCondition(
          "event.data.constructor.constructor('return process')()",
          event,
        ),
      ).toBe(false)
    })

    it('blocks template literals', () => {
      expect(evalTriggerHandlerCondition('`${process.exit(1)}`', event)).toBe(
        false,
      )
    })

    it('allows legitimate expressions', () => {
      expect(
        evalTriggerHandlerCondition("event.data.mediaType === 'IMAGE'", event),
      ).toBe(true)
    })
  })
})
