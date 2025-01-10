import type { UserStorageProvisionDTO } from '@stellariscloud/api-client'
import { cn, TypographyH2, TypographyH3 } from '@stellariscloud/ui-toolkit'
import { useRouter } from 'next/router'
import React from 'react'

import { ServerStorageProvisionAttributesList } from '../../../../../../components/server-storage-provision-attributes-list/server-storage-provision-attributes-list'
import { apiClient } from '../../../../../../services/api'

export function UserStorageProvisionDetailScreen() {
  const router = useRouter()
  const [userStorageProvisionId, setUserStorageProvision] =
    React.useState<UserStorageProvisionDTO>()

  const fetchUserStorageProvision = React.useCallback(
    (_userStorageProvisionId: string) => {
      void apiClient.userStorageProvisionsApi
        .getUserStorageProvision({
          userStorageProvisionId: _userStorageProvisionId,
        })
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
      fetchUserStorageProvision(router.query.userStorageProvisionId)
    }
  }, [
    router.query.userStorageProvisionId,
    fetchUserStorageProvision,
    userStorageProvisionId,
  ])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRotate = React.useCallback(
    (
      accessKeyHashId: string,
      newAccessKey: { accessKeyId: string; secretAccessKey: string },
    ) => {
      void apiClient.serverAccessKeysApi
        .rotateServerAccessKey({
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
            fetchUserStorageProvision(router.query.userStorageProvisionId)
          }
        })
    },
    [
      fetchUserStorageProvision,
      userStorageProvisionId,
      router.query.userStorageProvisionId,
    ],
  )

  return (
    <>
      <div className={cn('flex h-full flex-1 flex-col items-center p-4')}>
        <div className="container flex flex-1 flex-col">
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
