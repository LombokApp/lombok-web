import type { LogLevel } from './logging.constants'

export interface LogLine {
  level: LogLevel
  folderId?: string
  objectKey?: string
  message: string
  remote: boolean
}

export interface ILoggingContext {
  logs: {
    lines: LogLine[]
    lastChangeKey: string
  }
  appendLogLine: (line: LogLine) => void
}
