import type { AccessKeyDTO } from '@stellariscloud/api-client'
import { cn } from '@stellariscloud/ui-toolkit'
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { AccessKeyAttributeList } from '../../../../../../components/access-key-attribute-list/access-key-attributes-list'
import { AccessKeyRotateForm } from '../../../../../../components/access-key-rotate-form/access-key-rotate-form'
import { apiClient } from '../../../../../../services/api'

export function ServerAccessKeyDetailScreen() {
  const navigate = useNavigate()
  const params = useParams()
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
    if (typeof params.accessKeyHashId === 'string' && !accessKey) {
      fetchAccessKey({
        accessKeyHashId: params.accessKeyHashId,
      })
    }
  }, [accessKey, fetchAccessKey, params.accessKeyHashId])

  const handleRotate = React.useCallback(
    async (input: { accessKeyId: string; secretAccessKey: string }) => {
      const updatedAccessKey =
        await apiClient.serverAccessKeysApi.rotateServerAccessKey({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          accessKeyHashId: params.accessKeyHashId!,
          rotateAccessKeyInputDTO: {
            accessKeyId: input.accessKeyId,
            secretAccessKey: input.secretAccessKey,
          },
        })
      await navigate(
        `/server/storage/keys/${updatedAccessKey.data.accessKeyHashId}`,
      )
      fetchAccessKey({
        accessKeyHashId: updatedAccessKey.data.accessKeyHashId,
      })
    },
    [fetchAccessKey, navigate, params.accessKeyHashId],
  )

  return (
    <>
      <div
        className={cn(
          'flex h-full flex-1 flex-col items-center gap-6 overflow-y-auto px-4',
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
