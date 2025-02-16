import { useAuthContext } from '../../../../../auth-utils'
import type { NextPage } from 'next'
import React from 'react'

import { ServerAccessKeyDetailScreen } from '../../../../views/server/config/storage/server-access-keys/server-access-key-detail-screen/server-access-key-detail-screen.view'

const ServerStoragePage: NextPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="size-full">
      {authContext.authState.isAuthenticated && authContext.viewer?.isAdmin && (
        <ServerAccessKeyDetailScreen />
      )}
    </div>
  )
}

export default ServerStoragePage
