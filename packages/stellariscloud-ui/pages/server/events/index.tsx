import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import React from 'react'
import { ServerEventsScreen } from '../../../views/server/events/server-events-screen/server-events-screen.view'

const ServerEventsPage: NextPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="h-full w-full">
      {authContext.authState.isAuthenticated && authContext.viewer?.isAdmin && (
        <ServerEventsScreen />
      )}
    </div>
  )
}

export default ServerEventsPage
