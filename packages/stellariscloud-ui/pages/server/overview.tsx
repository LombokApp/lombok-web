import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import React from 'react'
import { ServerOverview } from '../../views/server/server-overview-screen/server-overview-screen.view'

const ServerOverviewPage: NextPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="h-full w-full">
      {authContext.authState.isAuthenticated && authContext.viewer?.isAdmin && (
        <ServerOverview />
      )}
    </div>
  )
}

export default ServerOverviewPage
