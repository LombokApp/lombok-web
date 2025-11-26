import { describe, expect, it } from 'bun:test'

import { isValidDockerHostPathOrHttp } from './docker-host.validator'

describe('isValidDockerHostPathOrHttp', () => {
  it('returns true for valid http endpoints', () => {
    const validEndpoints = [
      'http://localhost:2375',
      'https://docker.example.com',
      'HTTP://UPPERCASE.example.com',
    ]

    for (const endpoint of validEndpoints) {
      expect(isValidDockerHostPathOrHttp(endpoint)).toBe(true)
    }
  })

  it('returns true for supported windows style paths', () => {
    const validWindowsPaths = [
      String.raw`C:\ProgramData\docker\config.json`,
      'D:/docker/config.json',
      String.raw`\\server\share\docker.sock`,
    ]

    for (const path of validWindowsPaths) {
      expect(isValidDockerHostPathOrHttp(path)).toBe(true)
    }
  })

  it('returns true for linux absolute paths', () => {
    const validLinuxPaths = ['/var/run/docker.sock', '/tmp/docker/config.json']

    for (const path of validLinuxPaths) {
      expect(isValidDockerHostPathOrHttp(path)).toBe(true)
    }
  })

  it('returns false for invalid values', () => {
    const invalidValues = [
      '',
      'not-a-url',
      '../relative/path',
      'C:invalid\\path',
      'http//missing-colon.com',
      'ftp://not-supported.com',
      123,
      null,
      undefined,
    ]

    for (const value of invalidValues) {
      expect(isValidDockerHostPathOrHttp(value as never)).toBe(false)
    }
  })
})
