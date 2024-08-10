import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { ServerAppDetailScreen } from '../../../views/server/apps/server-app-detail-screen/server-app-detail-screen.view'

const ServerAppPage: NextPage = () => {
  const router = useRouter()
  return (
    <div className="h-full w-full">
      <ServerAppDetailScreen />
    </div>
  )
}

export default ServerAppPage
