import { TrashIcon } from '@heroicons/react/24/outline'
import type { FolderWorkerKeyData } from '@stellariscloud/api-client'
import { useRouter } from 'next/router'
import React from 'react'

import { Avatar } from '../../../design-system/avatar'
import { Button } from '../../../design-system/button/button'
import { ButtonGroup } from '../../../design-system/button-group/button-group'
import { Table } from '../../../design-system/table/table'
import { serverApi } from '../../../services/api'

export function ServerWorkerKeysScreen() {
  const router = useRouter()
  const [workerKeys, setWorkerKeys] = React.useState<FolderWorkerKeyData[]>()
  React.useEffect(() => {
    void serverApi
      .listServerWorkerKeys()
      .then((response) => setWorkerKeys(response.data.result))
  }, [])
  return (
    <div className="">
      {workerKeys?.length === 0 && <div>No worker keys</div>}
      {workerKeys && (
        <div className="flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <Table
                headers={['Name', 'Role', 'Permissions', 'Edit']}
                rows={workerKeys.map((workerKey, i) => [
                  <div key={i} className="flex items-center gap-4">
                    <Avatar
                      uniqueKey={workerKey.id}
                      size="xs"
                      className="bg-indigo-100"
                    />
                    <div className="flex flex-col">
                      <div>{workerKey.id}</div>
                      <div>{workerKey.createdAt}</div>
                    </div>
                  </div>,
                  <span
                    key={1}
                    className="inline-flex items-center rounded-md bg-green-50 dark:bg-green-50/10 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20 dark:ring-green-600/60"
                  >
                    <div>{workerKey.createdAt}</div>
                  </span>,
                  workerKeys.map((perm, j) => (
                    <span key={j}>{workerKey.id}</span>
                  )),
                  <ButtonGroup
                    key={i}
                    buttons={[
                      {
                        name: '',
                        icon: TrashIcon,
                        onClick: () =>
                          void router.push(
                            `/server/users/${workerKey.id}/delete`,
                          ),
                      },
                    ]}
                  />,
                ])}
              />
            </div>
          </div>
        </div>
      )}
      <Button onClick={() => void router.push('/server/users/new')}>
        Add Worker Key
      </Button>
    </div>
  )
}
