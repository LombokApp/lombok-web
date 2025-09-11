import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@lombokapp/ui-toolkit/components/card'
import { Card } from '@lombokapp/ui-toolkit/components/card/card'
import { useToast } from '@lombokapp/ui-toolkit/hooks'
import React from 'react'

import { AccessKeyRotateModal } from '@/src/components/access-key-rotate-modal/access-key-rotate-modal'
import { $api } from '@/src/services/api'

import { ServerAccessKeysTable } from '../server-access-keys/server-access-keys-table/server-access-keys-table.view'
import { ServerStorageLocation } from '../server-storage-location/server-storage-location.view'
import { UserStorageProvisions } from '../storage-provisions/storage-provisions.view'

export function ServerStorageConfigTab() {
  const { toast } = useToast()
  const [rotateKeyModalData, setRotateKeyModalData] = React.useState<{
    open: boolean
    accessKey?: {
      accessKeyHashId: string
      accessKeyId: string
      endpoint: string
      region: string
    }
  }>({ open: false })

  const onKeyRotateSuccess = () => {
    setRotateKeyModalData({ open: false })
    toast({
      title: 'Access key rotated successfully',
      description: 'The access key has been rotated successfully',
    })
  }

  const rotateAccessKeyMutation = $api.useMutation(
    'post',
    '/api/v1/server/access-keys/{accessKeyHashId}/rotate',
    {
      onSuccess: () => {
        setRotateKeyModalData({ open: false })
        onKeyRotateSuccess()
        toast({
          title: 'Access key rotated successfully',
          description: 'The access key has been rotated successfully',
        })
      },
    },
  )

  const openRotateModal = (accessKey: {
    accessKeyHashId: string
    accessKeyId: string
    endpoint: string
    region: string
  }) => setRotateKeyModalData({ open: true, accessKey })

  const [refreshKey, setRefreshKey] = React.useState('__initialval__')
  const triggerChildRefreshes = () => setRefreshKey(Math.random().toString())

  return (
    <div className="flex flex-col gap-4">
      <AccessKeyRotateModal
        isOpen={rotateKeyModalData.open}
        setIsOpen={(open) => setRotateKeyModalData((s) => ({ ...s, open }))}
        accessKey={rotateKeyModalData.accessKey}
        onSubmit={async (input) => {
          if (!rotateKeyModalData.accessKey) {
            return
          }
          await rotateAccessKeyMutation.mutateAsync({
            params: {
              path: {
                accessKeyHashId: rotateKeyModalData.accessKey.accessKeyHashId,
              },
            },
            body: input,
          })
          triggerChildRefreshes()
        }}
      />
      <Card>
        <CardHeader>
          <CardTitle>Server Storage Location</CardTitle>
          <CardDescription>
            Designate an S3 location where your server can store server level
            data, like app assets and payloads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <ServerStorageLocation
              openRotateModal={openRotateModal}
              refreshKey={refreshKey}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>User Storage Provisions</CardTitle>
          <CardDescription>
            Designate S3 locations that are provided to your users as managed
            storage options for new folders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <UserStorageProvisions
              openRotateModal={openRotateModal}
              refreshKey={refreshKey}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Access Keys In Use</CardTitle>
          <CardDescription>
            Distinct server provisioned S3 credentials in use by all users
            across the server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <ServerAccessKeysTable
              openRotateModal={openRotateModal}
              refreshKey={refreshKey}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
