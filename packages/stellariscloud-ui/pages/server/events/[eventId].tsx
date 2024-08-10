import type { NextPage } from 'next'
import React from 'react'

import { ServerEventDetailScreen } from '../../../views/server/server-event-detail-screen/server-event-detail-screen.view'

const ServerEventPage: NextPage = () => {
  return (
    <div className="h-full w-full">
      <ServerEventDetailScreen />
    </div>
  )
}

export default ServerEventPage
