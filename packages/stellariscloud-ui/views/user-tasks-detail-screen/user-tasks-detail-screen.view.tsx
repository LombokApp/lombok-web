import type { AccessKeyDTO } from '@stellariscloud/api-client'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'
import { apiClient } from '../../services/api'
import { PageHeading } from '../../design-system/page-heading/page-heading'
import { TaskAttributeList } from '../../components/task-attributes-list/task-attributes-list'

export function UserTaskDetailScreen() {
  const router = useRouter()
  const [accessKey, setAccessKey] = React.useState<AccessKeyDTO>()
  const [accessKeyBuckets, setAccessKeyBuckets] =
    React.useState<{ name?: string; creationDate?: Date }[]>()

  const fetchAccessKey = React.useCallback(
    ({ accessKeyHashId }: { accessKeyHashId: string }) => {
      void apiClient.accessKeysApi
        .getAccessKey({ accessKeyHashId })
        .then((resp) => setAccessKey(resp.data.accessKey))
    },
    [],
  )

  const fetchAccessKeyBuckets = React.useCallback(
    ({ accessKeyHashId }: { accessKeyHashId: string }) => {
      void apiClient.accessKeysApi
        .listAccessKeyBuckets({ accessKeyHashId })
        .then((resp) => setAccessKeyBuckets(resp.data.result))
    },
    [],
  )

  React.useEffect(() => {
    if (typeof router.query.accessKeyHashId === 'string' && !accessKey) {
      void fetchAccessKey({
        accessKeyHashId: router.query.accessKeyHashId,
      })
      void fetchAccessKeyBuckets({
        accessKeyHashId: router.query.accessKeyHashId,
      })
    }
  }, [router.query.accessKeyHashId])

  return (
    <>
      <div
        className={clsx(
          'p-4 items-center flex flex-1 flex-col h-full overflow-x-hidden overflow-y-auto',
        )}
      >
        <div className="container flex-1 flex flex-col">
          <PageHeading
            titleIconBg={'bg-rose-500'}
            avatarKey={`${accessKey?.accessKeyId}_${accessKey?.endpointDomain}`}
            title={[
              `User Access Key: ${accessKey?.accessKeyId} (${accessKey?.endpointDomain})`,
            ]}
          />
          <TaskAttributeList accessKey={accessKey} />
          <div className="flex flex-col">
            {accessKeyBuckets?.map(({ name, creationDate }, i) => (
              <div key={i}>{name}</div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
