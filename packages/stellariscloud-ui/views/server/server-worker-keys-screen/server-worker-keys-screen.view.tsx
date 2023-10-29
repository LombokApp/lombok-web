import {
  DocumentDuplicateIcon,
  KeyIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import type {
  FolderWorkerData,
  FolderWorkerKeyData,
} from '@stellariscloud/api-client'
import { timeSinceOrUntil } from '@stellariscloud/utils'
import React from 'react'

import { Avatar } from '../../../design-system/avatar'
import { Button } from '../../../design-system/button/button'
import { ButtonGroup } from '../../../design-system/button-group/button-group'
import { EmptyState } from '../../../design-system/empty-state/empty-state'
import { Icon } from '../../../design-system/icon'
import { Table } from '../../../design-system/table/table'
import { serverApi } from '../../../services/api'
import { copyToClipboard } from '../../../utils/clipboard'

export function ServerWorkerKeysScreen() {
  const [listKeysResetKey, setListKeysResetKey] = React.useState('__')
  const [workerKeys, setWorkerKeys] = React.useState<FolderWorkerKeyData[]>()
  const [workers, setWorkers] = React.useState<FolderWorkerData[]>()
  const [createdWorkerKeys, setCreatedWorkerKeys] = React.useState<{
    [key: string]: string
  }>({})

  const refetchWorkerKeys = React.useCallback(() => {
    setListKeysResetKey(`${Math.random()}`)
  }, [])

  React.useEffect(() => {
    void serverApi
      .listServerWorkerKeys()
      .then((response) => setWorkerKeys(response.data.result))
  }, [listKeysResetKey])

  React.useEffect(() => {
    void serverApi
      .listServerWorkers()
      .then((response) => setWorkers(response.data.result))
  }, [listKeysResetKey])

  const handleCreateServerWorkerKey = () => {
    void serverApi.createServerWorkerKey().then(({ data: createdKey }) => {
      setCreatedWorkerKeys((keys) => ({
        ...keys,
        [createdKey.workerKey.id]: createdKey.token,
      }))
      refetchWorkerKeys()
    })
  }

  const handleDeleteServerWorkerKey = React.useCallback(
    (workerKeyId: string) => {
      void serverApi.deleteServerWorkerKey({ workerKeyId }).then(() => {
        refetchWorkerKeys()
      })
    },
    [refetchWorkerKeys],
  )

  return (
    <div className="">
      <dl className="divide-y divide-gray-100 dark:divide-gray-700">
        <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <dt className="text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
            Server Worker Keys
            <div className="mt-1 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:col-span-2 sm:mt-0">
              Worker require a key to connect to Stellaris Cloud. Here you can
              create keys that will authorize a worker on behalf of the server,
              meaning they can perform work for all users.
            </div>
          </dt>
          <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
            {workerKeys?.length === 0 && (
              <div className="pb-4">
                <EmptyState
                  buttonText="Add Server Worker Key"
                  icon={KeyIcon}
                  text="No server worker keys are created"
                  onButtonPress={() => handleCreateServerWorkerKey()}
                />
              </div>
            )}
            {workerKeys && workerKeys.length > 0 && (
              <div className="flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <Table
                      headers={['ID', 'Created', 'Expiry', 'Delete']}
                      rows={workerKeys.map((workerKey, i) => [
                        <div key={i} className="flex items-center gap-4">
                          <Avatar
                            uniqueKey={workerKey.id}
                            size="sm"
                            className="bg-indigo-100"
                          />
                          <div className="flex flex-col">
                            <div>{workerKey.id}</div>
                            <div>
                              {createdWorkerKeys[workerKey.id] ? (
                                <div className="flex gap-2">
                                  <i>{`${createdWorkerKeys[workerKey.id].slice(
                                    0,
                                    40,
                                  )}...`}</i>
                                  <Button
                                    size="xs"
                                    className="text-xs"
                                    onClick={() =>
                                      void copyToClipboard(
                                        createdWorkerKeys[workerKey.id],
                                      )
                                    }
                                  >
                                    <Icon
                                      size="xs"
                                      icon={DocumentDuplicateIcon}
                                    />
                                    Copy
                                  </Button>
                                </div>
                              ) : (
                                '****************************************'
                              )}
                            </div>
                          </div>
                        </div>,
                        <div key={1}>
                          {new Date(workerKey.createdAt).toLocaleString()}
                        </div>,
                        <div key={1}>
                          {timeSinceOrUntil(
                            new Date(workerKey.accessTokenExpiresAt),
                          )}
                        </div>,
                        <ButtonGroup
                          key={i}
                          buttons={[
                            {
                              name: '',
                              icon: TrashIcon,
                              onClick: () =>
                                handleDeleteServerWorkerKey(workerKey.id),
                            },
                          ]}
                        />,
                      ])}
                    />
                  </div>
                </div>
                <div className="">
                  <Button onClick={() => handleCreateServerWorkerKey()}>
                    Add Server Worker Key
                  </Button>
                </div>
              </div>
            )}
          </dd>
        </div>
        <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <dt className="text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
            Server Workers
            <div className="mt-1 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:col-span-2 sm:mt-0">
              Any server workers that have connected to the server will be
              listed here.
            </div>
          </dt>
          <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
            {workers?.length === 0 && (
              <div className="pb-4">
                <EmptyState
                  icon={WrenchScrewdriverIcon}
                  text="No workers have checked in"
                />
              </div>
            )}
            {workers && workers.length > 0 && (
              <Table
                headers={['ID', 'Created', 'First Seen', 'Last Seen']}
                rows={workers.map((worker, i) => [
                  <div key={i} className="flex items-center gap-4">
                    <Avatar
                      uniqueKey={worker.id}
                      size="sm"
                      className="bg-indigo-100"
                    />
                    <div className="flex flex-col">
                      <div>{worker.id}</div>
                      <div>Capabilities: {worker.capabilities.join(', ')}</div>
                      <div>External ID: {worker.externalId}</div>
                      <div>Key ID: {worker.keyId}</div>
                    </div>
                  </div>,
                  <div key={1}>
                    {new Date(worker.createdAt).toLocaleString()}
                  </div>,
                  <div key={1}>
                    {timeSinceOrUntil(new Date(worker.firstSeen))}
                  </div>,
                  <div key={1}>
                    {timeSinceOrUntil(new Date(worker.lastSeen))}
                  </div>,
                ])}
              />
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}
