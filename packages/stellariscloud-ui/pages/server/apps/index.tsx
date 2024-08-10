import type { UserDTO } from '@stellariscloud/api-client'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { ServerAppsScreen } from '../../../views/server/apps/server-apps-screen/server-apps-screen.view'

const ServerAppsPage: NextPage = () => {
  const router = useRouter()
  return (
    <div className="h-full w-full">
      <ServerAppsScreen />
    </div>
  )
}

export default ServerAppsPage
