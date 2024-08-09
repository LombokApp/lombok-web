import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import React from 'react'
import { ServerUsersScreen } from '../../../views/server/server-users-screen/server-users-screen.view'

const ServerUsersPage: NextPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="h-full w-full">
      {authContext.authState.isAuthenticated && authContext.viewer?.isAdmin && (
        <ServerUsersScreen />
      )}
    </div>
  )
}

export default ServerUsersPage
