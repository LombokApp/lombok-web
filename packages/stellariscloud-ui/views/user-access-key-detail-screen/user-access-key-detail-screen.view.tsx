import type { AccessKeyDTO, EventDTO } from '@stellariscloud/api-client'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'
import { apiClient } from '../../services/api'
import { AccessKeyAttributeList } from '../../components/access-key-attribute-list/access-key-attributes-list'
import { AccessKeyRotateForm } from '../../components/access-key-rotate-form/access-key-rotate-form'
import {
  Card,
  CardContent,
  CardHeader,
  Separator,
  TypographyH2,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'

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
    <div className="flex flex-1 flex-col container gap-3 self-center">
      <TypographyH2 className="pb-0">
        Access Key {accessKey?.accessKeyHashId}
      </TypographyH2>
      <Separator className="bg-foreground/10 mb-3" />
      <div className="container flex-1 flex flex-col gap-4">
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
              {accessKeyBuckets?.map(({ name, creationDate }, i) => (
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
