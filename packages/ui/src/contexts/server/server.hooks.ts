import { useContext } from 'react'

import { ServerContext } from './server.context'

export const useServerContext = () => {
  const context = useContext(ServerContext)
  return context
}
