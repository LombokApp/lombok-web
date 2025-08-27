import React from 'react'

import type { ILoggingContext } from './logging.types'

export const LoggingContext = React.createContext<ILoggingContext>(
  {} as ILoggingContext,
)
