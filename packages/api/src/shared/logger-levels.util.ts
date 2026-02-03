import type { LogLevel } from '@nestjs/common'

/** NestJS log levels ordered from least to most severe (verbose → fatal). */
const LOG_LEVEL_ORDER: LogLevel[] = [
  'verbose',
  'debug',
  'log',
  'warn',
  'error',
  'fatal',
]

/**
 * Returns log levels to enable based on a minimum level.
 * Enables the specified level and all more severe levels.
 *
 * @param minimum - Minimum log level (e.g. 'debug', 'warn'). Case-insensitive.
 * @returns Array of LogLevel values for NestJS logger config.
 */
export function getLogLevelsFromMinimum(minimum: string): LogLevel[] {
  const normalized = minimum.toLowerCase().trim()
  if (!normalized) {
    return ['log', 'warn', 'error', 'fatal']
  }
  const index = LOG_LEVEL_ORDER.indexOf(normalized as LogLevel)
  if (index === -1) {
    return ['log', 'warn', 'error', 'fatal']
  }
  return LOG_LEVEL_ORDER.slice(index)
}
