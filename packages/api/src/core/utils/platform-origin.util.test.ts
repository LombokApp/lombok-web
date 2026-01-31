import { describe, expect, it } from 'bun:test'

import { buildPlatformOrigin } from './platform-origin.util'

describe('platform-origin.util', () => {
  describe('buildPlatformOrigin', () => {
    it('should build https origin without port when port is omitted', () => {
      expect(
        buildPlatformOrigin({
          platformHost: 'example.com',
          platformHttps: true,
        }),
      ).toBe('https://example.com')
    })

    it('should build http origin without port when port is omitted', () => {
      expect(
        buildPlatformOrigin({
          platformHost: 'localhost',
          platformHttps: false,
        }),
      ).toBe('http://localhost')
    })

    it('should omit port 443 for https', () => {
      expect(
        buildPlatformOrigin({
          platformHost: 'example.com',
          platformHttps: true,
          platformPort: 443,
        }),
      ).toBe('https://example.com')
    })

    it('should omit port 80 for http', () => {
      expect(
        buildPlatformOrigin({
          platformHost: 'example.com',
          platformHttps: false,
          platformPort: 80,
        }),
      ).toBe('http://example.com')
    })

    it('should include non-standard port for https', () => {
      expect(
        buildPlatformOrigin({
          platformHost: 'example.com',
          platformHttps: true,
          platformPort: 3000,
        }),
      ).toBe('https://example.com:3000')
    })

    it('should include non-standard port for http', () => {
      expect(
        buildPlatformOrigin({
          platformHost: 'localhost',
          platformHttps: false,
          platformPort: 8080,
        }),
      ).toBe('http://localhost:8080')
    })
  })
})
