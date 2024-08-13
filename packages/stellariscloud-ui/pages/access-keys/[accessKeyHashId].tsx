import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import React from 'react'
import { UserAccessKeyDetailScreen } from '../../views/user-access-key-detail-screen/user-access-key-detail-screen.view'

const UserAccessKeyDetailPage: NextPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="h-full w-full">
      {authContext.authState.isAuthenticated && <UserAccessKeyDetailScreen />}
    </div>
  )
}

export default UserAccessKeyDetailPage
