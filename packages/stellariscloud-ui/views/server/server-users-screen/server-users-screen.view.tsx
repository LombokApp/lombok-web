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
    <div className="">
      {users && (
        <div className="flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <Table
                headers={['Name', 'Admin', 'Permissions', 'Edit']}
                rows={users.map((u, i) => [
                  <div key={i} className="flex items-center gap-4">
                    <Avatar
                      uniqueKey={u.id}
                      size="sm"
                      className="bg-indigo-100"
                    />
                    <div className="flex flex-col">
                      <div>{u.username}</div>
                      <div>{u.email}</div>
                      <div>{u.id}</div>
                    </div>
                  </div>,
                  <span
                    key={1}
                    className={clsx(
                      'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ',
                      u.isAdmin
                        ? 'bg-green-50 dark:bg-green-50/10 ring-green-600/20 dark:ring-green-600/60 text-green-700 dark:text-green-400'
                        : 'bg-yellow-50 dark:bg-yellow-50/10 ring-yellow-600/20 dark:ring-yellow-600/60 text-yellow-700 dark:text-yellow-400',
                    )}
                  >
                    {u.isAdmin ? 'true' : 'false'}
                  </span>,
                  <div key={i}>
                    {u.permissions.length > 0
                      ? u.permissions.map((perm, j) => (
                          <span key={j}>{perm}</span>
                        ))
                      : '[]'}
                  </div>,
                  <ButtonGroup
                    key={i}
                    buttons={[
                      {
                        name: '',
                        icon: PencilSquareIcon,
                        onClick: () =>
                          void router.push(`/server/users/${u.id}`),
                      },
                      {
                        name: '',
                        icon: TrashIcon,
                        onClick: () =>
                          void router.push(`/server/users/${u.id}/delete`),
                      },
                    ]}
                  />,
                ])}
              />
              <Button onClick={() => void router.push('/server/users/new')}>
                Add User
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
