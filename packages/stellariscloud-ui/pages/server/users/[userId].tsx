import type { UserData } from '@stellariscloud/api-client'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { serverApi } from '../../../services/api'
import { ServerUserDetailScreen } from '../../../views/server/server-user-detail-screen/server-user-detail-screen'

const ServerUserPage: NextPage = () => {
  const router = useRouter()
  const isNew = router.query.userId === 'new'
  const [user, setUser] = React.useState<UserData>()
  React.useEffect(() => {
    if (!isNew && typeof router.query.userId === 'string' && !user) {
      void serverApi
        .getUser({ userId: router.query.userId })
        .then((u) => setUser(u.data.result))
    }
  }, [user, isNew, router.query.userId])

  return (
    <div className="h-full w-full">
      {isNew ? (
        <ServerUserDetailScreen
          user={{ name: '', email: '', permissions: [] }}
        />
      ) : (
        user && (
          <ServerUserDetailScreen
            userId={router.query.userId as string}
            user={user}
          />
        )
      )}
    </div>
  )
}

export default ServerUserPage
