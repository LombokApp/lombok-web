import React from 'react'

import { LoggingContext } from './logging.context'
import type { ILoggingContext } from './logging.types'

export const useLoggingContext = (): ILoggingContext =>
  React.useContext(LoggingContext)
