import { EnumType } from '@stellariscloud/utils'
import type * as r from 'runtypes'

/**
 * see https://github.com/winstonjs/triple-beam/blob/master/config/npm.js#L14-L22
 */
export enum LogLevel {
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Http = 'http',
  Verbose = 'verbose',
  Debug = 'debug',
  Silly = 'silly',
}

export const LogLevelType: r.Runtype<LogLevel> = EnumType(LogLevel)

export const LOG_LEVELS: Record<LogLevel, number> = {
  [LogLevel.Error]: 0,
  [LogLevel.Warn]: 1,
  [LogLevel.Info]: 2,
  [LogLevel.Http]: 3,
  [LogLevel.Verbose]: 4,
  [LogLevel.Debug]: 5,
  [LogLevel.Silly]: 6,
}
