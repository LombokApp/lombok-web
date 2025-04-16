import {
  Card,
  CardContent,
  CardHeader,
  Separator,
  TypographyH2,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { AccessKeyAttributeList } from '../../components/access-key-attribute-list/access-key-attributes-list'
import { AccessKeyRotateForm } from '../../components/access-key-rotate-form/access-key-rotate-form'
import { accessKeysApiHooks, apiClient } from '../../services/api'

export function UserAccessKeyDetailScreen({
  accessKeyHashId,
}: {
  accessKeyHashId: string
}) {
  const params = useParams()
  const navigate = useNavigate()
  // const [accessKey, setAccessKey] = React.useState<AccessKeyDTO>()

  const accessKeyQuery = accessKeysApiHooks.useGetAccessKey({
    accessKeyHashId,
  })

  const accessKeyBucketsQuery = accessKeysApiHooks.useListAccessKeyBuckets({
    accessKeyHashId,
  })

  const handleRotate = React.useCallback(
    async (input: { accessKeyId: string; secretAccessKey: string }) => {
      if (!accessKeyQuery.data) {
        return Promise.reject(new Error('No Access Key.'))
      }
      const updatedAccessKey = await apiClient.accessKeysApi.rotateAccessKey({
        accessKeyHashId,
        rotateAccessKeyInputDTO: {
          accessKeyId: input.accessKeyId,
          secretAccessKey: input.secretAccessKey,
        },
      })
      if (typeof params.accessKeyHashId === 'string') {
        await navigate(`/access-keys/${updatedAccessKey.data.accessKeyHashId}`)
      }
    },
    [accessKeyHashId, accessKeyQuery.data, navigate, params.accessKeyHashId],
  )

  return (
    <div className="container flex flex-1 flex-col gap-3 self-center">
      <TypographyH2 className="pb-0">Access Key {accessKeyHashId}</TypographyH2>
      <Separator className="mb-3 bg-foreground/10" />
      <div className="container flex flex-1 flex-col gap-4">
        <AccessKeyAttributeList accessKey={accessKeyQuery.data?.accessKey} />
        <Card>
          <CardHeader>
            <TypographyH3>Rotate Key</TypographyH3>
          </CardHeader>
          <CardContent>
            {accessKeyQuery.data?.accessKey && (
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
              {accessKeyBucketsQuery.data?.result.map(({ name }, i) => (
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
