/**
 * Unit tests for bridge config parsing.
 */
import { describe, expect, it } from 'bun:test'

import { parseBridgeConfig } from './config.js'

const BASE_HOSTS = {
  local: { type: 'docker_endpoint', host: '/var/run/docker.sock' },
}

function basePayload(overrides?: Record<string, unknown>) {
  return {
    bridgeApiSecret: 'test-secret',
    bridgeJwtSecret: 'jwt-secret',
    bridgeJwtExpiry: 3600,
    httpPort: 3100,
    wsPort: 3101,
    logLevel: 'info',
    maxSessions: 200,
    maxConcurrentPerSession: 100,
    sessionIdleTimeout: 1800000,
    ephemeralGracePeriod: 5000,
    dockerHosts: BASE_HOSTS,
    ...overrides,
  }
}

describe('parseBridgeConfig', () => {
  it('throws when no secret is set', () => {
    expect(() =>
      parseBridgeConfig({
        bridgeApiSecret: '',
        dockerHosts: BASE_HOSTS,
      }),
    ).toThrow('bridgeApiSecret must be set')
  })

  it('throws when dockerHosts is empty', () => {
    expect(() =>
      parseBridgeConfig({
        bridgeApiSecret: 'test',
        dockerHosts: {},
      }),
    ).toThrow('dockerHosts must define at least one host')
  })

  it('throws for non-object payload', () => {
    expect(() => parseBridgeConfig(null)).toThrow('expected an object')
    expect(() => parseBridgeConfig('string')).toThrow('expected an object')
  })

  it('parses a valid payload', () => {
    const config = parseBridgeConfig(basePayload())
    expect(config.bridgeApiSecret).toBe('test-secret')
    expect(config.httpPort).toBe(3100)
    expect(config.wsPort).toBe(3101)
    expect(config.bridgeJwtExpiry).toBe(3600)
    expect(config.maxSessions).toBe(200)
    expect(config.maxConcurrentPerSession).toBe(100)
    expect(config.sessionIdleTimeout).toBe(1800000)
    expect(config.ephemeralGracePeriod).toBe(5000)
    expect(Object.keys(config.dockerHosts)).toEqual(['local'])
  })

  it('uses default values for missing optional fields', () => {
    const config = parseBridgeConfig({
      bridgeApiSecret: 'test',
      dockerHosts: BASE_HOSTS,
    })
    expect(config.httpPort).toBe(3100)
    expect(config.wsPort).toBe(3101)
    expect(config.logLevel).toBe('info')
    expect(config.bridgeJwtExpiry).toBe(3600)
    expect(config.maxSessions).toBe(200)
    expect(config.maxConcurrentPerSession).toBe(100)
    expect(config.sessionIdleTimeout).toBe(1800000)
    expect(config.ephemeralGracePeriod).toBe(5000)
  })

  it('parses custom port values', () => {
    const config = parseBridgeConfig(
      basePayload({ httpPort: 4000, wsPort: 4001 }),
    )
    expect(config.httpPort).toBe(4000)
    expect(config.wsPort).toBe(4001)
  })

  it('parses custom session limits', () => {
    const config = parseBridgeConfig(
      basePayload({
        maxSessions: 50,
        maxConcurrentPerSession: 20,
        sessionIdleTimeout: 900000,
        ephemeralGracePeriod: 10000,
      }),
    )
    expect(config.maxSessions).toBe(50)
    expect(config.maxConcurrentPerSession).toBe(20)
    expect(config.sessionIdleTimeout).toBe(900000)
    expect(config.ephemeralGracePeriod).toBe(10000)
  })
})
