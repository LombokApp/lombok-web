import type { AccessKeyDTO } from '@stellariscloud/api-client'
import {
  Card,
  CardContent,
  CardHeader,
  Separator,
  TypographyH2,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import React from 'react'

import { AccessKeyAttributeList } from '../../components/access-key-attribute-list/access-key-attributes-list'
import { AccessKeyRotateForm } from '../../components/access-key-rotate-form/access-key-rotate-form'
import { apiClient } from '../../services/api'
import { useNavigate, useParams } from 'react-router-dom'

export function UserAccessKeyDetailScreen() {
  const params = useParams()
  const navigate = useNavigate()
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
    if (typeof params.accessKeyHashId === 'string' && !accessKey) {
      fetchAccessKey({
        accessKeyHashId: params.accessKeyHashId,
      })
      fetchAccessKeyBuckets({
        accessKeyHashId: params.accessKeyHashId,
      })
    }
  }, [accessKey, fetchAccessKey, fetchAccessKeyBuckets, params.accessKeyHashId])

  const handleRotate = React.useCallback(
    async (input: { accessKeyId: string; secretAccessKey: string }) => {
      if (!accessKey) {
        return Promise.reject(new Error('No Access Key.'))
      }
      const updatedAccessKey = await apiClient.accessKeysApi.rotateAccessKey({
        accessKeyHashId: accessKey.accessKeyHashId,
        rotateAccessKeyInputDTO: {
          accessKeyId: input.accessKeyId,
          secretAccessKey: input.secretAccessKey,
        },
      })
      if (typeof params.accessKeyHashId === 'string') {
        await navigate(`/access-keys/${updatedAccessKey.data.accessKeyHashId}`)
        fetchAccessKey({
          accessKeyHashId: updatedAccessKey.data.accessKeyHashId,
        })
      }
    },
    [accessKey, fetchAccessKey, navigate],
  )

  return (
    <div className="container flex flex-1 flex-col gap-3 self-center">
      <TypographyH2 className="pb-0">
        Access Key {accessKey?.accessKeyHashId}
      </TypographyH2>
      <Separator className="mb-3 bg-foreground/10" />
      <div className="container flex flex-1 flex-col gap-4">
        <AccessKeyAttributeList accessKey={accessKey} />
        <Card>
          <CardHeader>
            <TypographyH3>Rotate Key</TypographyH3>
          </CardHeader>
          <CardContent>
            {accessKey && (
              <AccessKeyRotateForm onSubmit={(input) => handleRotate(input)} />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <Card>
            <CardHeader>
              <TypographyH3>Buckets</TypographyH3>
            </CardHeader>

            <CardContent>
              {accessKeyBuckets?.map(({ name }, i) => (
                <div key={i} className="italic opacity-50">
                  {name}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
