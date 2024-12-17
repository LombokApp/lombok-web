import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'

import { apiClient } from '../../../../../../services/api'
import { UserStorageProvisionDTO } from '@stellariscloud/api-client'
import { ServerStorageProvisionAttributesList } from '../../../../../../components/server-storage-provision-attributes-list/server-storage-provision-attributes-list'
import { TypographyH2, TypographyH3 } from '@stellariscloud/ui-toolkit'

export function UserStorageProvisionDetailScreen() {
  const router = useRouter()
  const [userStorageProvisionId, setUserStorageProvision] =
    React.useState<UserStorageProvisionDTO>()

  const fetchUserStorageProvision = React.useCallback(
    (userStorageProvisionId: string) => {
      void apiClient.userStorageProvisionsApi
        .getUserStorageProvision({ userStorageProvisionId })
        .then((resp) => {
          setUserStorageProvision(resp.data.userStorageProvision)
        })
    },
    [],
  )

  React.useEffect(() => {
    if (
      typeof router.query.userStorageProvisionId === 'string' &&
      !userStorageProvisionId
    ) {
      void fetchUserStorageProvision(router.query.userStorageProvisionId)
    }
  }, [router.query.userStorageProvisionId])

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
            typeof router.query.userStorageProvisionId === 'string' &&
            !userStorageProvisionId
          ) {
            void fetchUserStorageProvision(router.query.userStorageProvisionId)
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
            {`Storage Provision: ${userStorageProvisionId?.label}`}
          </TypographyH2>
          <TypographyH3>{userStorageProvisionId?.description}</TypographyH3>
        </div>
        <ServerStorageProvisionAttributesList
          userStorageProvision={userStorageProvisionId}
        />
      </div>
    </>
  )
}
