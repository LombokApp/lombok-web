import { PlusIcon } from '@heroicons/react/20/solid'
import type { S3ConnectionData } from '@stellariscloud/api-client'
import type { S3ConnectionInput } from '@stellariscloud/types'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'

import { ConnectionCard } from '../../components/connection-card/connection-card'
import { ConnectionsEmptyState } from '../../components/connections-empty-state/connections-empty-state'
import { CreateS3ConnectionForm } from '../../components/create-s3-connection-form/create-s3-connection-form'
import { Button } from '../../design-system/button/button'
import { Icon } from '../../design-system/icon'
import { PageHeading } from '../../design-system/page-heading/page-heading'
import { s3ConnectionsAPI } from '../../services/api'

export const ListS3ConnectionsScreen = () => {
  const router = useRouter()
  const [s3Connections, setS3Connections] = React.useState<S3ConnectionData[]>()
  const [s3ConnectionFormKey, setS3ConnectionFormKey] = React.useState<string>()

  // reflect add query flag state
  React.useEffect(() => {
    if (router.query.add === 'true' && !s3ConnectionFormKey) {
      setS3ConnectionFormKey(`${Math.random()}`)
    } else if (router.query.add !== 'true' && s3ConnectionFormKey) {
      setS3ConnectionFormKey(undefined)
    }
  }, [router.query.add, s3ConnectionFormKey])

  React.useEffect(() => {
    void s3ConnectionsAPI
      .listS3Connections()
      .then((response) => setS3Connections(response.data.result))
  }, [])

  const handleAddS3Connection = (s3Connection: S3ConnectionInput) => {
    void s3ConnectionsAPI
      .createS3Connection({ createS3ConnectionRequest: s3Connection })
      .then((response) => {
        setS3Connections(s3Connections?.concat([response.data]))
        void router.push({ pathname: router.pathname })
      })
  }

  const handleTestS3Connection = (s3Connection: S3ConnectionInput) =>
    s3ConnectionsAPI
      .testS3Connection({ createS3ConnectionRequest: s3Connection })
      .then((response) => response.data)

  const handleDeleteS3Connection = (s3ConnectionId: string) => {
    void s3ConnectionsAPI
      .deleteS3Connection({ s3ConnectionId })
      .then(() =>
        setS3Connections(
          s3Connections?.filter((ak) => ak.id !== s3ConnectionId),
        ),
      )
  }

  const handleStartCreate = () =>
    void router.push({
      pathname: router.pathname,
      query: { add: 'true' },
    })

  return (
    <div className={clsx('items-center flex flex-col gap-6 h-full px-6')}>
      <div className="container flex-1 flex flex-col">
        <div className="py-4 flex items-start gap-10">
          <PageHeading
            title={s3ConnectionFormKey ? 'New Connection' : 'Your Connections'}
          >
            {!s3ConnectionFormKey && (
              <Button
                size="lg"
                primary={true}
                onClick={() =>
                  void router.push({
                    pathname: router.pathname,
                    query: { add: 'true' },
                  })
                }
              >
                <Icon size="sm" icon={PlusIcon} className="text-white" />
                New Connection
              </Button>
            )}
          </PageHeading>
        </div>
        <div
          className={clsx(
            'overflow-hidden flex flex-col justify-around duration-200 items-center',
            !s3ConnectionFormKey ? 'h-0' : 'flex-1',
          )}
        >
          <CreateS3ConnectionForm
            onCancel={() => void router.push({ pathname: router.pathname })}
            onSubmit={(values) => handleAddS3Connection(values)}
            onTest={(values) => handleTestS3Connection(values)}
            key={s3ConnectionFormKey}
          />
        </div>
        {s3Connections?.length === 0 && !s3ConnectionFormKey ? (
          <div className="flex flex-1 flex-col items-center justify-around">
            <div className="w-fit">
              <ConnectionsEmptyState onCreate={handleStartCreate} />
            </div>
          </div>
        ) : (
          <div
            className={clsx(
              'flex flex-col py-4 gap-6 w-full duration-200',
              s3ConnectionFormKey && 'opacity-0',
            )}
          >
            {s3Connections?.map((s3Connection) => (
              <ConnectionCard
                key={s3Connection.id}
                connection={s3Connection}
                onDelete={() => handleDeleteS3Connection(s3Connection.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
