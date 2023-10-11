import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { UserData } from '@stellariscloud/api-client'
import { useRouter } from 'next/router'
import React from 'react'

import { Avatar } from '../../../design-system/avatar'
import { Button } from '../../../design-system/button/button'
import { ButtonGroup } from '../../../design-system/button-group/button-group'
import { Table } from '../../../design-system/table/table'
import { serverApi } from '../../../services/api'

export function ServerUsers() {
  const router = useRouter()
  const [users, setUsers] =
    React.useState<(UserData & { permissions: { label: string }[] })[]>()
  React.useEffect(() => {
    void serverApi
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
                headers={['Name', 'Role', 'Permissions', 'Edit']}
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
                    className="inline-flex items-center rounded-md bg-green-50 dark:bg-green-50/10 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20 dark:ring-green-600/60"
                  >
                    {u.role}
                  </span>,
                  u.permissions.map((perm, j) => <span key={j}>{perm}</span>),
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
