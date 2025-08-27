import React from 'react'

import { MAX_LOG_LINES } from './logging.constants'
import { LoggingContext } from './logging.context'
import type { LogLine } from './logging.types'

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
