import type { AccessKeyDTO, EventDTO } from '@stellariscloud/api-client'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'
import { apiClient } from '../../services/api'
import { PageHeading } from '../../design-system/page-heading/page-heading'
import { AccessKeyAttributeList } from '../../components/access-key-attribute-list/access-key-attributes-list'
import { AccessKeyRotateForm } from '../../components/access-key-rotate-form/access-key-rotate-form'

export function UserAccessKeyDetailScreen() {
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

  const handleRotate = React.useCallback(
    async (input: { accessKeyId: string; secretAccessKey: string }) => {
      if (!accessKey) {
        return Promise.reject('No Access Key.')
      }
      const updatedAccessKey = await apiClient.accessKeysApi.rotateAccessKey({
        accessKeyHashId: accessKey.accessKeyHashId,
        rotateAccessKeyInputDTO: {
          accessKeyId: input.accessKeyId,
          secretAccessKey: input.secretAccessKey,
        },
      })
      if (typeof router.query.accessKeyHashId === 'string') {
        await router.push(
          `/access-keys/${updatedAccessKey.data.accessKeyHashId}`,
        )
        fetchAccessKey({
          accessKeyHashId: updatedAccessKey.data.accessKeyHashId,
        })
      }
    },
    [accessKey, router.query.accessKeyHashId],
  )

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
          <AccessKeyAttributeList accessKey={accessKey} />
          {accessKey && (
            <AccessKeyRotateForm onSubmit={(input) => handleRotate(input)} />
          )}
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
