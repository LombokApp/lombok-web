import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import React from 'react'
import { ServerStorageScreen } from '../../../views/server/storage/server-storage-screen/server-storage-screen.view'

const ServerStoragePage: NextPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="h-full w-full">
      {authContext.authState.isAuthenticated && authContext.viewer?.isAdmin && (
        <ServerStorageScreen />
      )}
    </div>
  )
}

export default ServerStoragePage
