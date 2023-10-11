import type { NextPage } from 'next'
import React from 'react'

import { ServerScreen } from '../../views/server/server-screen.view'

const ServerPage: NextPage = () => {
  return (
    <div className="h-full w-full">
      <ServerScreen />
    </div>
  )
}

export default ServerPage
