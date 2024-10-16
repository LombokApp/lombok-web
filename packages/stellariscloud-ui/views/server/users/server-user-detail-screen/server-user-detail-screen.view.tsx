import type { UserDTO } from '@stellariscloud/api-client'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'

import { UserAccountStats } from '../../../../components/user-account-stats/user-account-stats'
import { formatBytes, timeSinceOrUntil } from '@stellariscloud/utils'
import { UserAttributeList } from '../../../../components/user-attribute-list/user-attribute-list'
import { apiClient } from '../../../../services/api'

export function ServerUserDetailScreen() {
  const router = useRouter()

  const [user, setUser] = React.useState<UserDTO>()
  React.useEffect(() => {
    if (typeof router.query.userId === 'string' && !user) {
      void apiClient.usersApi
        .getUser({ userId: router.query.userId })
        .then((u) => setUser(u.data.user))
    }
  }, [user, router.query.userId])

  // const handleSubmitClick = React.useCallback(() => {
  //   void apiClient.usersApi
  //     .updateUser({
  //       userId: userObject.id ?? '',
  //       userUpdateInputDTO: userObject as UserUpdateInputDTO,
  //     })
  //     .then(({ data }) => {
  //       void router.push(`/server/users/${data.user.id}`)
  //     })
  // }, [router, userObject])

  return (
    <>
      <div
        className={clsx(
          'items-center flex flex-1 flex-col gap-6 h-full overflow-y-auto',
        )}
      >
        <div className="container flex-1 flex flex-col">
          <div className="flex min-w-full items-start gap-4 p-8">
            <div className="flex-1">
              <UserAttributeList user={user} />
            </div>
            <UserAccountStats
              stats={{
                folderCount: { value: '103', label: 'Folders' },
                totalData: {
                  value: formatBytes(685746167465),
                  label: 'Total Data',
                },
                lastLogin: {
                  value: timeSinceOrUntil(new Date(1723242258000)),
                  label: 'Last Login',
                },
                created: {
                  value: timeSinceOrUntil(new Date(1713242258000)),
                  label: 'Created',
                },
              }}
            />
          </div>
        </div>
      </div>
    </>
  )
}
