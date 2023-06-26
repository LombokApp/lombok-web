import { PlusIcon } from '@heroicons/react/24/outline'
import type { S3ConnectionData } from '@stellariscloud/api-client'
import { Button, Heading, Icon } from '@stellariscloud/design-system'
import type { S3ConnectionInput } from '@stellariscloud/types'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'

import { CreateS3ConnectionForm } from '../../components/create-s3-connection-form/create-s3-connection-form'
import { S3ConnectionsEmptyState } from '../../components/s3-connections-empty-state/s3-connections-empty-state'
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
      .createS3Connection({ inlineObject4: s3Connection })
      .then((response) => {
        setS3Connections(s3Connections?.concat([response.data]))
        void router.push({ pathname: router.pathname })
      })
  }

  const handleTestS3Connection = (s3Connection: S3ConnectionInput) =>
    s3ConnectionsAPI
      .testS3Connection({ inlineObject5: s3Connection })
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
    <div className={clsx('items-center flex flex-col gap-6 pb-10 h-full')}>
      <div className="container h-full">
        <div className="py-4 flex items-start gap-10">
          <Heading level={3}>
            {s3ConnectionFormKey ? 'Add S3 connection' : 'Your S3 connections'}
          </Heading>
          {!s3ConnectionFormKey && s3Connections?.length !== 0 && (
            <Button size="md" onClick={handleStartCreate}>
              <Icon size="md" icon={PlusIcon} />
              New S3 connection
            </Button>
          )}
        </div>
        <div
          className={clsx(
            'overflow-hidden flex flex-col justify-around duration-200 items-center',
            !s3ConnectionFormKey ? 'h-0' : 'h-full',
          )}
        >
          <div className="bg-black/[.3] p-4 rounded">
            <CreateS3ConnectionForm
              onCancel={() => void router.push({ pathname: router.pathname })}
              onSubmit={(values) => handleAddS3Connection(values)}
              onTest={(values) => handleTestS3Connection(values)}
              key={s3ConnectionFormKey}
            />
          </div>
        </div>
        {s3Connections?.length === 0 && !s3ConnectionFormKey ? (
          <div className="h-full flex flex-col items-center justify-around">
            <div className="w-fit">
              <S3ConnectionsEmptyState onStartCreate={handleStartCreate} />
            </div>
          </div>
        ) : (
          <div
            className={clsx(
              'flex flex-col p-4 gap-6 w-full duration-200',
              s3ConnectionFormKey && 'opacity-0',
            )}
          >
            {s3Connections?.map((s3Connection, i) => (
              <div
                key={i}
                className="flex justify-between gap-4 bg-transparent border border-secondary rounded-lg p-4 min-w-[20rem]"
              >
                <div className="flex flex-col">
                  <div className="text-2xl">{s3Connection.name}</div>
                  <div className="text-xs opacity-50">
                    Access Key ID: {s3Connection.accessKeyId}
                  </div>
                  <div>{s3Connection.endpoint}</div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleDeleteS3Connection(s3Connection.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
