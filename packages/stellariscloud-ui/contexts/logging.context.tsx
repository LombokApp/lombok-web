import React from 'react'

export interface FolderView {
  [key: string]: { size: number; type: string }
}

export class FileCacheError extends Error {}

export enum LogLevel {
  TRACE = 'TRACE',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

const MAX_LOG_LINES = 10

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

const LoggingContext = React.createContext<ILoggingContext>(
  {} as ILoggingContext,
)

export const LoggingContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const logs = React.useRef<LogLine[]>([])

  const [lastChangeKey, setLastChangeKey] = React.useState<string>('_')

  const handleAppendLog = React.useCallback((line: LogLine) => {
    logs.current = [...logs.current, line].slice(
      Math.max(0, logs.current.length + 1 - MAX_LOG_LINES),
    )
    setLastChangeKey((Math.random() + 1).toString(36).substring(7))
  }, [])

  return (
    <LoggingContext.Provider
      value={{
        logs: {
          lines: logs.current,
          lastChangeKey,
        },
        appendLogLine: handleAppendLog,
      }}
    >
      {children}
    </LoggingContext.Provider>
  )
}

export const useLoggingContext = (): ILoggingContext =>
  React.useContext(LoggingContext)
