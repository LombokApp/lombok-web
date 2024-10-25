import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'

import { apiClient } from '../../../../services/api'
import { StorageProvisionDTO } from '@stellariscloud/api-client'
import { ServerStorageProvisionAttributesList } from '../../../../components/server-storage-provision-attributes-list/server-storage-provision-attributes-list'
import { TypographyH2, TypographyH3 } from '@stellariscloud/ui-toolkit'

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
      accessKeyHashId: string,
      newAccessKey: { accessKeyId: string; secretAccessKey: string },
    ) => {
      void apiClient.serverAccessKeysApi
        .rotateAccessKey({
          accessKeyHashId,
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
      <div className={clsx('p-4 items-center flex flex-1 flex-col h-full')}>
        <div className="container flex-1 flex flex-col">
          <TypographyH2>
            {`Storage Provision: ${storageProvision?.label}`}
          </TypographyH2>
          <TypographyH3>{storageProvision?.description}</TypographyH3>
        </div>
        <ServerStorageProvisionAttributesList
          storageProvision={storageProvision}
        />
      </div>
    </>
  )
}
