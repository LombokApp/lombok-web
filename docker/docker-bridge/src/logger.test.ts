import { describe, expect, it, mock } from 'bun:test'

import { createLogger } from './logger.js'

interface LogEntry {
  level: string
  msg: string
  ts: string
  key?: string
}

function parseLogEntry(line: string): LogEntry {
  return JSON.parse(line) as LogEntry
}

// Capture stdout writes
function captureStdout(): { lines: string[]; restore: () => void } {
  const lines: string[] = []
  const original = process.stdout.write.bind(process.stdout)
  const mockWrite = mock((data: string | Buffer) => {
    lines.push(typeof data === 'string' ? data : data.toString())
    return true
  })
  process.stdout.write = mockWrite as unknown as typeof process.stdout.write
  return {
    lines,
    restore: () => {
      process.stdout.write = original
    },
  }
}

describe('createLogger', () => {
  it('logs info messages at info level', () => {
    const capture = captureStdout()
    try {
      const logger = createLogger({ level: 'info' })
      logger.info('test message', { key: 'value' })

      expect(capture.lines).toHaveLength(1)
      const entry = parseLogEntry(capture.lines[0])
      expect(entry.level).toBe('info')
      expect(entry.msg).toBe('test message')
      expect(entry.key).toBe('value')
      expect(entry.ts).toBeDefined()
    } finally {
      capture.restore()
    }
  })

  it('filters debug messages at info level', () => {
    const capture = captureStdout()
    try {
      const logger = createLogger({ level: 'info' })
      logger.debug('should be filtered')

      expect(capture.lines).toHaveLength(0)
    } finally {
      capture.restore()
    }
  })

  it('passes debug messages at debug level', () => {
    const capture = captureStdout()
    try {
      const logger = createLogger({ level: 'debug' })
      logger.debug('debug msg')

      expect(capture.lines).toHaveLength(1)
      const entry = parseLogEntry(capture.lines[0])
      expect(entry.level).toBe('debug')
    } finally {
      capture.restore()
    }
  })

  it('passes warn and error at info level', () => {
    const capture = captureStdout()
    try {
      const logger = createLogger({ level: 'info' })
      logger.warn('a warning')
      logger.error('an error')

      expect(capture.lines).toHaveLength(2)
      expect(parseLogEntry(capture.lines[0]).level).toBe('warn')
      expect(parseLogEntry(capture.lines[1]).level).toBe('error')
    } finally {
      capture.restore()
    }
  })

  it('only passes error at error level', () => {
    const capture = captureStdout()
    try {
      const logger = createLogger({ level: 'error' })
      logger.debug('nope')
      logger.info('nope')
      logger.warn('nope')
      logger.error('yes')

      expect(capture.lines).toHaveLength(1)
      expect(parseLogEntry(capture.lines[0]).level).toBe('error')
    } finally {
      capture.restore()
    }
  })

  it('defaults to info level for unknown level string', () => {
    const capture = captureStdout()
    try {
      const logger = createLogger({ level: 'bogus' })
      logger.debug('filtered')
      logger.info('passes')

      expect(capture.lines).toHaveLength(1)
    } finally {
      capture.restore()
    }
  })
})
