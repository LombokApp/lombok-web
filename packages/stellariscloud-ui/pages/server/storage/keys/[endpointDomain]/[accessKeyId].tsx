import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import React from 'react'
import { ServerAccessKeyDetailScreen } from '../../../../../views/server/storage/server-access-key-detail-screen/server-access-key-detail-screen.view'

const ServerStoragePage: NextPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="h-full w-full">
      {authContext.authState.isAuthenticated && authContext.viewer?.isAdmin && (
        <ServerAccessKeyDetailScreen />
      )}
    </div>
  )
}

export default ServerStoragePage
