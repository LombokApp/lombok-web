import { useAuthContext } from '../../../../../auth-utils'
import type { NextPage } from 'next'
import React from 'react'

import { UserStorageProvisionDetailScreen } from '../../../../views/server/config/storage/user-storage-provisions/user-storage-provision-detail-screen/user-storage-provision-detail-screen.view'

const ServerStoragePage: NextPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="size-full">
      {authContext.authState.isAuthenticated && authContext.viewer?.isAdmin && (
        <UserStorageProvisionDetailScreen />
      )}
    </div>
  )
}

export default ServerStoragePage
