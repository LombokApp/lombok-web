import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import React from 'react'
import { UserTaskDetailScreen } from '../../views/user-tasks-detail-screen/user-tasks-detail-screen.view'

const UseTaskDetailPage: NextPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="h-full w-full">
      {authContext.authState.isAuthenticated && <UserTaskDetailScreen />}
    </div>
  )
}

export default UseTaskDetailPage
