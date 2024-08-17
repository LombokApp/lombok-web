import type { AccessKeyDTO, EventDTO } from '@stellariscloud/api-client'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'

import { PageHeading } from '../../../../design-system/page-heading/page-heading'
import { apiClient } from '../../../../services/api'
import { AccessKeyAttributeList } from '../../../../components/access-key-attribute-list/access-key-attributes-list'
import { AccessKeyRotateForm } from '../../../../components/access-key-rotate-form/access-key-rotate-form'

export function ServerAccessKeyDetailScreen() {
  const router = useRouter()
  const [accessKey, setAccessKey] = React.useState<AccessKeyDTO>()

  const fetchAccessKey = React.useCallback(
    ({ accessKeyHashId }: { accessKeyHashId: string }) => {
      void apiClient.serverAccessKeysApi
        .getServerAccessKey({ accessKeyHashId })
        .then((resp) => {
          setAccessKey(resp.data.accessKey)
        })
    },
    [],
  )

  React.useEffect(() => {
    if (typeof router.query.accessKeyHashId === 'string' && !accessKey) {
      void fetchAccessKey({
        accessKeyHashId: router.query.accessKeyHashId,
      })
    }
  }, [router.query.accessKeyHashId])

  const handleRotate = React.useCallback(
    async (input: { accessKeyId: string; secretAccessKey: string }) => {
      const updatedAccessKey =
        await apiClient.serverAccessKeysApi.rotateAccessKey({
          accessKeyHashId: router.query.accessKeyHashId as string,
          rotateAccessKeyInputDTO: {
            accessKeyId: input.accessKeyId,
            secretAccessKey: input.secretAccessKey,
          },
        })
      await router.push(
        `/server/storage/keys/${updatedAccessKey.data.accessKeyHashId}`,
      )
      fetchAccessKey({
        accessKeyHashId: updatedAccessKey.data.accessKeyHashId,
      })
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
            titleIconBg={'bg-blue-500'}
            avatarKey={accessKey?.accessKeyHashId}
            title={[
              `Server Access Key: ${accessKey?.accessKeyId} (${accessKey?.endpointDomain})`,
            ]}
          />
          <AccessKeyAttributeList accessKey={accessKey} />
          {accessKey && (
            <AccessKeyRotateForm onSubmit={(input) => handleRotate(input)} />
          )}
        </div>
      </div>
    </>
  )
}
