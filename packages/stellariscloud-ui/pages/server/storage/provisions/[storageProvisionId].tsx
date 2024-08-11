import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import React from 'react'
import { ServerStorageProvisionDetailScreen } from '../../../../views/server/storage/server-storage-provision-detail-screen/server-storage-provision-detail-screen.view'

const ServerStoragePage: NextPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="h-full w-full">
      {authContext.authState.isAuthenticated && authContext.viewer?.isAdmin && (
        <ServerStorageProvisionDetailScreen />
      )}
    </div>
  )
}

export default ServerStoragePage
