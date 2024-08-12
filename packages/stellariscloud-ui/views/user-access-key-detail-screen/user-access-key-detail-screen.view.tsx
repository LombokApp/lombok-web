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
    ({
      accessKeyId,
      endpointDomain,
    }: {
      accessKeyId: string
      endpointDomain: string
    }) => {
      void apiClient.accessKeysApi
        .getAccessKey({ accessKeyId, endpointDomain })
        .then((resp) => setAccessKey(resp.data.accessKey))
    },
    [],
  )

  const fetchAccessKeyBuckets = React.useCallback(
    ({
      accessKeyId,
      endpointDomain,
    }: {
      accessKeyId: string
      endpointDomain: string
    }) => {
      void apiClient.accessKeysApi
        .listAccessKeyBuckets({ accessKeyId, endpointDomain })
        .then((resp) => setAccessKeyBuckets(resp.data.result))
    },
    [],
  )

  React.useEffect(() => {
    if (
      typeof router.query.accessKeyId === 'string' &&
      typeof router.query.endpointDomain === 'string' &&
      !accessKey
    ) {
      void fetchAccessKey({
        accessKeyId: router.query.accessKeyId,
        endpointDomain: router.query.endpointDomain,
      })
      void fetchAccessKeyBuckets({
        accessKeyId: router.query.accessKeyId,
        endpointDomain: router.query.endpointDomain,
      })
    }
  }, [router.query.accessKeyId, router.query.endpointDomain])

  const handleRotate = React.useCallback(
    async (input: { accessKeyId: string; secretAccessKey: string }) => {
      if (!accessKey) {
        return Promise.reject('No Access Key.')
      }
      await apiClient.accessKeysApi.rotateAccessKey({
        accessKeyId: accessKey.accessKeyId,
        endpointDomain: accessKey.endpointDomain,
        rotateAccessKeyInputDTO: {
          accessKeyId: input.accessKeyId,
          secretAccessKey: input.secretAccessKey,
        },
      })
      if (
        typeof router.query.accessKeyId === 'string' &&
        typeof router.query.endpointDomain === 'string'
      ) {
        await router.push(
          `/access-keys/${encodeURIComponent(accessKey.endpointDomain)}/${input.accessKeyId}`,
        )
        void fetchAccessKey({
          accessKeyId: input.accessKeyId,
          endpointDomain: router.query.endpointDomain,
        })
      }
    },
    [accessKey, router.query.accessKeyId, router.query.endpointDomain],
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
            {accessKeyBuckets?.map(({ name, creationDate }) => (
              <div>{name}</div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
