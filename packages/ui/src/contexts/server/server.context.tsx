import React from 'react'

import type { IServerContext } from './server.types'

export const ServerContext = React.createContext<IServerContext>(
  {} as IServerContext,
)
