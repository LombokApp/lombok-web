import type { NextPage } from 'next'
import React from 'react'

import { AccountScreen } from '../../views/worker-tokens-screen/worker-tokens-screen.view'

const WorkersPage: NextPage = () => {
  return (
    <div className="flex flex-col overflow-hidden h-full w-full">
      <AccountScreen />
    </div>
  )
}

export default WorkersPage
