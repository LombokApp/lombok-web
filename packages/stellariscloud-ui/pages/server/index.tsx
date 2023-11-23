import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import React from 'react'

import { ServerScreen } from '../../views/server/server-screen.view'

const ServerPage: NextPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="h-full w-full">
      {authContext.authState.isAuthenticated && <ServerScreen />}
    </div>
  )
}

export default ServerPage
