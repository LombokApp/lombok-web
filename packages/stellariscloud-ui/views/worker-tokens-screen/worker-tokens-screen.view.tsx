import { DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { Button, Heading, Icon, Input } from '@stellariscloud/design-system'
import type { WorkerTokenDTO } from '@stellariscloud/types'
import clsx from 'clsx'
import React from 'react'

import { api } from '../../services/stellariscloud-api/api'
import { copyToClipboard } from '../../utils/clipboard'

export const AccountScreen = () => {
  const [workerTokens, setWorkerTokens] = React.useState<WorkerTokenDTO[]>()
  const [createTokenName, setCreateTokenName] = React.useState('')

  const refreshWorkerTokens = React.useCallback(() => {
    return api
      .listWorkerTokens()
      .then((response) => setWorkerTokens(response.data.result))
  }, [])

  React.useEffect(() => {
    void refreshWorkerTokens()
  }, [refreshWorkerTokens])

  const handleCreateClick = React.useCallback(() => {
    if (createTokenName.length > 0 && createTokenName.length <= 128) {
      void api
        .createWorkerToken({ name: createTokenName })
        .then(({ data: { result: newToken } }) => {
          setCreateTokenName('')
          setWorkerTokens([...(workerTokens ?? []), newToken])
        })
        .catch((e) => console.error(e))
    }
  }, [createTokenName, workerTokens])

  const handleDeleteClick = React.useCallback(
    (id: string) => {
      void api
        .deleteWorkerToken(id)
        .then(() => refreshWorkerTokens())
        .catch((e) => console.error(e))
    },
    [refreshWorkerTokens],
  )

  const handleRefreshClick = React.useCallback(
    (id: string) => {
      void api
        .refreshWorkerToken(id)
        .then(({ data: { result: newToken } }) => {
          setCreateTokenName('')
          setWorkerTokens([
            ...(workerTokens ?? []).filter((t) => t.id !== id),
            newToken,
          ])
        })
        .catch((e) => console.error(e))
    },
    [workerTokens],
  )
  return (
    <div className={clsx('items-center flex flex-col gap-6 pb-10')}>
      <div className="container">
        <div className="py-4">
          <Heading level={3}>Your worker tokens</Heading>
        </div>
        {workerTokens?.length === 0 && (
          <div className="italic">You have no worker tokens</div>
        )}
        <div className="flex flex-col py-4 gap-6">
          {workerTokens?.map((key, i) => {
            return (
              <div
                key={i}
                className="border-2 border-primary rounded-xl p-4 min-w-[20rem] flex justify-between"
              >
                <div className="flex flex-col gap-1">
                  <span>{key.name}</span>
                  <span className="opacity-50 text-sm">ID: {key.id}</span>
                  {key.token && (
                    <div className="flex gap-4 max-w-[50rem] border border-primary rounded p-2">
                      <pre
                        className="break-all text-sm opacity-30"
                        style={{ whiteSpace: 'pre-wrap' }}
                      >
                        {key.token}
                      </pre>
                      <Button
                        variant="link"
                        onClick={() => void copyToClipboard(key.token ?? '')}
                      >
                        <Icon
                          className="text-white"
                          size="md"
                          icon={DocumentDuplicateIcon}
                        />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRefreshClick(key.id)}
                  >
                    Refresh token
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteClick(key.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex flex-col gap-2 bg-black/[.3] p-4 rounded-lg max-w-[40rem]">
          <Heading level={5}>Create a new worker token</Heading>
          <Heading level={6}>Token name</Heading>
          <div className="flex gap-2">
            <Input
              value={createTokenName}
              onChange={(e) => setCreateTokenName(e.target.value)}
            />
            <Button variant="primary" onClick={handleCreateClick}>
              Create
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
