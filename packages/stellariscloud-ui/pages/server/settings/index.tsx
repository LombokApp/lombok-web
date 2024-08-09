import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import React from 'react'
import { ServerSettingsScreen } from '../../../views/server/server-settings-screen/server-settings-screen'

const ServerSettingsPage: NextPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="h-full w-full">
      {authContext.authState.isAuthenticated && authContext.viewer?.isAdmin && (
        <ServerSettingsScreen />
      )}
    </div>
  )
}

export default ServerSettingsPage
