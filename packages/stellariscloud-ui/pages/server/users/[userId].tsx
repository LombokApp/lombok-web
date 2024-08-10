import type { UserDTO } from '@stellariscloud/api-client'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { ServerUserDetailScreen } from '../../../views/server/users/server-user-detail-screen/server-user-detail-screen.view'

const ServerUserPage: NextPage = () => {
  return (
    <div className="h-full w-full">
      <ServerUserDetailScreen />
    </div>
  )
}

export default ServerUserPage
