import type { AccessKeyDTO, EventDTO } from '@stellariscloud/api-client'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'

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
          'items-center flex flex-1 flex-col gap-6 h-full overflow-y-auto px-4',
        )}
      >
        <div className="container flex-1 flex flex-col pt-12">
          <AccessKeyAttributeList accessKey={accessKey} />
          {accessKey && (
            <AccessKeyRotateForm onSubmit={(input) => handleRotate(input)} />
          )}
        </div>
      </div>
    </>
  )
}
