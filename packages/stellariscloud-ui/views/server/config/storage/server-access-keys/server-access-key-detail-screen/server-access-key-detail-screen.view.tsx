import type { AccessKeyDTO } from '@stellariscloud/api-client'
import { cn } from '@stellariscloud/ui-toolkit'
import { useRouter } from 'next/router'
import React from 'react'

import { AccessKeyAttributeList } from '../../../../../../components/access-key-attribute-list/access-key-attributes-list'
import { AccessKeyRotateForm } from '../../../../../../components/access-key-rotate-form/access-key-rotate-form'
import { apiClient } from '../../../../../../services/api'

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
      fetchAccessKey({
        accessKeyHashId: router.query.accessKeyHashId,
      })
    }
  }, [accessKey, fetchAccessKey, router.query.accessKeyHashId])

  const handleRotate = React.useCallback(
    async (input: { accessKeyId: string; secretAccessKey: string }) => {
      const updatedAccessKey =
        await apiClient.serverAccessKeysApi.rotateServerAccessKey({
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
    [fetchAccessKey, router],
  )

  return (
    <>
      <div
        className={cn(
          'items-center flex flex-1 flex-col gap-6 h-full overflow-y-auto px-4',
        )}
      >
        <div className="container flex flex-1 flex-col pt-12">
          <AccessKeyAttributeList accessKey={accessKey} />
          {accessKey && (
            <AccessKeyRotateForm onSubmit={(input) => handleRotate(input)} />
          )}
        </div>
      </div>
    </>
  )
}
