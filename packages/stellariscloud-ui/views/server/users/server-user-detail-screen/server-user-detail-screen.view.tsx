import type {
  UserCreateInputDTO,
  UserDTO,
  UserUpdateInputDTO,
} from '@stellariscloud/api-client'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'

import type { UserInput } from '../../../../components/server-user-form/server-user-form'
import { ServerUserForm } from '../../../../components/server-user-form/server-user-form'
import { Button } from '../../../../design-system/button/button'
import { PageHeading } from '../../../../design-system/page-heading/page-heading'
import { apiClient } from '../../../../services/api'
import { UserAccountStats } from '../../../../components/user-account-stats/user-account-stats'
import { formatBytes, timeSinceOrUntil } from '@stellariscloud/utils'
import { UserAttributeList } from '../../../../components/user-attribute-list/user-attribute-list'

export function ServerUserDetailScreen({ user }: { user: UserDTO }) {
  const router = useRouter()

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
          'items-center flex flex-1 flex-col gap-6 h-full overflow-y-auto px-4',
        )}
      >
        <div className="container flex-1 flex flex-col">
          <div className="py-4 flex items-start gap-10">
            <PageHeading
              titleIconBg={'bg-amber-100'}
              avatarKey={user.id}
              title={[`User: ${user.email ?? user.id}`]}
            />
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 justify-between items-start">
              <div className="flex-1">
                <UserAttributeList
                  attributes={{
                    email: user.email ?? '',
                    name: user.name ?? '',
                    username: user.username ?? '',
                    permissions: user.permissions ?? [],
                    isAdmin: user.isAdmin ?? false,
                  }}
                />
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
      </div>
    </>
  )
}
