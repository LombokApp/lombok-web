import clsx from 'clsx'
import React from 'react'

import { PageHeading } from '../../design-system/page-heading/page-heading'
import { AccessKeyDTO } from '@stellariscloud/api-client'
import { apiClient } from '../../services/api'
import { EmptyState } from '../../design-system/empty-state/empty-state'
import { KeyIcon } from '@heroicons/react/24/outline'
import { AccessKeysList } from '../../components/access-keys-list/access-keys-list'

export function UserAccessKeysScreen() {
  const [accessKeys, setAccessKeys] = React.useState<AccessKeyDTO[]>()

  const fetchAccessKeys = React.useCallback(() => {
    void apiClient.accessKeysApi.listAccessKeys().then((resp) => {
      setAccessKeys(resp.data.result)
    })
  }, [])

  React.useEffect(() => {
    void fetchAccessKeys()
  }, [])

  const handleRotate = React.useCallback(
    (
      accessKeyId: string,
      newAccessKey: { accessKeyId: string; secretAccessKey: string },
    ) => {
      void apiClient.accessKeysApi
        .rotateAccessKey({
          rotateAccessKeyInputDTO: {
            accessKeyId,
            newAccessKeyId: newAccessKey.accessKeyId,
            newSecretAccessKey: newAccessKey.secretAccessKey,
          },
        })
        .then((resp) => {
          fetchAccessKeys()
        })
    },
    [],
  )

  return (
    <div
      className={clsx(
        'p-4 items-center flex flex-1 flex-col h-full overflow-x-hidden overflow-y-auto',
      )}
    >
      <div className="container flex-1 flex flex-col">
        <div className="flex items-start gap-10">
          <PageHeading
            title={['Your Access Keys']}
            titleIcon={KeyIcon}
            titleIconBg="bg-rose-500"
            subtitle="Manage and review access keys used by your current and recent folders."
          />
        </div>
        <div className="pt-8">
          {(accessKeys?.length ?? 0) > 0 ? (
            <div className="flex flex-col gap-4 items-start">
              <AccessKeysList
                onRotateAccessKey={(accessKeyId, newAccessKey) =>
                  handleRotate(accessKeyId, newAccessKey)
                }
                accessKeys={accessKeys ?? []}
              />
            </div>
          ) : (
            <EmptyState
              icon={KeyIcon}
              text="No access keys have been created"
            />
          )}
        </div>
      </div>
    </div>
  )
}
