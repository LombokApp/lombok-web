import type { NextPage } from 'next'
import React from 'react'

import { UserProfileScreen } from '../views/user-profile-screen/user-profile-screen'

const Profile: NextPage = () => {
  return (
    <div className="h-full w-full">
      <UserProfileScreen />
    </div>
  )
}

export default Profile
