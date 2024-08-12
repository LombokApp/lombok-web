import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'

import { PageHeading } from '../../../../design-system/page-heading/page-heading'
import { apiClient } from '../../../../services/api'
import { StorageProvisionDTO } from '@stellariscloud/api-client'
import { ServerStorageProvisionAttributesList } from '../../../../components/server-storage-provision-attributes-list/server-storage-provision-attributes-list'

export function ServerStorageProvisionDetailScreen() {
  const router = useRouter()
  const [storageProvision, setStorageProvision] =
    React.useState<StorageProvisionDTO>()

  const fetchStorageProvision = React.useCallback(
    (storageProvisionId: string) => {
      void apiClient.storageProvisionsApi
        .getStorageProvision({ storageProvisionId })
        .then((resp) => {
          setStorageProvision(resp.data.storageProvision)
        })
    },
    [],
  )

  React.useEffect(() => {
    if (
      typeof router.query.storageProvisionId === 'string' &&
      !storageProvision
    ) {
      void fetchStorageProvision(router.query.storageProvisionId)
    }
  }, [router.query.storageProvisionId])

  const handleRotate = React.useCallback(
    (
      accessKeyId: string,
      endpointDomain: string,
      newAccessKey: { accessKeyId: string; secretAccessKey: string },
    ) => {
      void apiClient.serverAccessKeysApi
        .rotateAccessKey({
          accessKeyId,
          endpointDomain,
          rotateAccessKeyInputDTO: {
            accessKeyId: newAccessKey.accessKeyId,
            secretAccessKey: newAccessKey.secretAccessKey,
          },
        })
        .then(() => {
          if (
            typeof router.query.storageProvisionId === 'string' &&
            !storageProvision
          ) {
            void fetchStorageProvision(router.query.storageProvisionId)
          }
        })
    },
    [],
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
            titleIconBg={'bg-green-100'}
            avatarSize="md"
            avatarKey={`${storageProvision?.accessKeyId}_${storageProvision?.id}`}
            title={[`Storage Provision: ${storageProvision?.label}`]}
            subtitle={storageProvision?.description}
          />
          <ServerStorageProvisionAttributesList
            storageProvision={storageProvision}
          />
        </div>
      </div>
    </>
  )
}
