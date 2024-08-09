import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { UserDTO } from '@stellariscloud/api-client'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'

import { Avatar } from '../../../design-system/avatar'
import { Button } from '../../../design-system/button/button'
import { ButtonGroup } from '../../../design-system/button-group/button-group'
import { Table } from '../../../design-system/table/table'
import { apiClient } from '../../../services/api'
import { StackedList } from '../../../design-system/stacked-list/stacked-list'
import { PageHeading } from '../../../design-system/page-heading/page-heading'

export function ServerUsersScreen() {
  const router = useRouter()
  const [users, setUsers] =
    React.useState<(UserDTO & { permissions: { label: string }[] })[]>()
  React.useEffect(() => {
    void apiClient.usersApi
      .listUsers()
      .then((response) =>
        setUsers(response.data.result.map((r) => ({ ...r, permissions: [] }))),
      )
  }, [])
  return (
    <div
      className={clsx(
        'p-4 items-center flex flex-1 flex-col gap-6 h-full overflow-y-auto',
      )}
    >
      <PageHeading title={'Server Users'} />
      {users && (
        <div className="inline-block min-w-full py-2 align-middle">
          <StackedList
            items={users.map((u, i) => (
              <div className="flex min-w-0 gap-x-4">
                <Avatar uniqueKey={u.id} size="sm" className="bg-indigo-100" />

                <div className="min-w-0 flex-auto">
                  <p className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                    {u.username} - {u.id}
                  </p>
                  <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500 dark:text-gray-100">
                    <p className="whitespace-nowrap">{u.email}</p>
                    <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                      <circle r={1} cx={1} cy={1} />
                    </svg>
                    {u.isAdmin && (
                      <>
                        <p className="truncate">admin</p>
                        <svg
                          viewBox="0 0 2 2"
                          className="h-0.5 w-0.5 fill-current"
                        >
                          <circle r={1} cx={1} cy={1} />
                        </svg>
                      </>
                    )}
                    <p className="truncate">Created {u.createdAt}</p>
                  </div>
                </div>
                <ButtonGroup
                  key={i}
                  buttons={[
                    {
                      name: '',
                      icon: PencilSquareIcon,
                      onClick: () => void router.push(`/server/users/${u.id}`),
                    },
                    {
                      name: '',
                      icon: TrashIcon,
                      onClick: () =>
                        void router.push(`/server/users/${u.id}/delete`),
                    },
                  ]}
                />
              </div>
            ))}
          />
          <div className="pt-4">
            <Button onClick={() => void router.push('/server/users/new')}>
              Add User
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
