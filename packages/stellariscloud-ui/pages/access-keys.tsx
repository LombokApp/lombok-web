import type { NextPage } from 'next'
import React from 'react'

import { UserAccessKeysScreen } from '../views/server/user-access-keys-screen/user-access-keys-screen'

const AccessKeys: NextPage = () => {
  return (
    <div className="h-full w-full">
      <UserAccessKeysScreen />
    </div>
  )
}

export default AccessKeys
