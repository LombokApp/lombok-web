import { FolderIcon, PlusIcon } from '@heroicons/react/24/outline'
import React from 'react'

import { Button } from '@stellariscloud/ui-toolkit'
import { EmptyState } from '../../../../../design-system/empty-state/empty-state'
import { apiClient } from '../../../../../services/api'
import type { UserStorageProvisionFormValues } from './user-storage-provision-form/user-storage-provision-form'
import { UserStorageProvisionDTO } from '@stellariscloud/api-client'
import { UserStorageProvisionsTable } from '../../../../../components/user-storage-provisions-table/user-storage-provisions-table'
import {
  MutationType,
  UserStorageProvisionModal,
} from './user-storage-provision-modal'

export function UserStorageProvisions() {
  const [userStorageProvisions, setUserStorageProvisions] =
    React.useState<UserStorageProvisionDTO[]>()

  const [modalData, setModalData] = React.useState<{
    userStorageProvision: UserStorageProvisionDTO | undefined
    mutationType: MutationType
  }>({
    userStorageProvision: undefined,
    mutationType: 'CREATE',
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAddStorageProvision = React.useCallback(
    (input: UserStorageProvisionFormValues) =>
      apiClient.userStorageProvisionsApi
        .createUserStorageProvision({
          userStorageProvisionInputDTO: {
            ...input,
          },
        })
        .then((resp) => {
          setUserStorageProvisions(resp.data.result)
        }),
    [],
  )

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleUpdateStorageProvision = React.useCallback(
    (
      userStorageProvision: UserStorageProvisionDTO,
      input: UserStorageProvisionFormValues,
    ) =>
      apiClient.userStorageProvisionsApi
        .updateUserStorageProvision({
          userStorageProvisionId: userStorageProvision.id,
          userStorageProvisionInputDTO: {
            ...input,
          },
        })
        .then((resp) => setUserStorageProvisions(resp.data.result)),
    [],
  )

  const handleDeleteStorageProvision = React.useCallback(
    (userStorageProvisionId: string) =>
      apiClient.userStorageProvisionsApi
        .deleteUserStorageProvision({
          userStorageProvisionId,
        })
        .then((resp) => {
          setUserStorageProvisions(resp.data.result)
        }),
    [],
  )

  React.useEffect(() => {
    void apiClient.userStorageProvisionsApi
      .listUserStorageProvisions()
      .then((resp) => {
        setUserStorageProvisions(resp.data.result)
      })
  }, [])

  return (
    <div className="w-full">
      <UserStorageProvisionModal
        // eslint-disable-next-line @typescript-eslint/require-await
        onSubmit={async () => undefined}
        setModalData={setModalData}
        modalData={modalData}
      />
      <dl className="divide-y divide-gray-100 dark:divide-gray-700">
        <div className="flex flex-col sm:gap-4">
          <dd className="mt-1 text-sm leading-6 sm:col-span-5 sm:mt-0">
            {(userStorageProvisions?.length ?? 0) > 0 ? (
              <div className="flex flex-col gap-4 items-start">
                <div className="w-full">
                  <UserStorageProvisionsTable
                    userStorageProvisions={userStorageProvisions ?? []}
                    onEdit={(userStorageProvision) =>
                      setModalData({
                        userStorageProvision,
                        mutationType: 'UPDATE',
                      })
                    }
                    onDelete={(storageProvision) =>
                      void handleDeleteStorageProvision(storageProvision.id)
                    }
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    setModalData({
                      userStorageProvision: {
                        accessKeyHashId: '',
                        bucket: '',
                        description: '',
                        accessKeyId: '',
                        endpoint: '',
                        id: '',
                        label: '',
                        provisionTypes: [],
                        region: '',
                        prefix: '',
                      },
                      mutationType: 'CREATE',
                    })
                  }
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Storage Provision
                </Button>
              </div>
            ) : (
              <EmptyState
                buttonText="Add storage provision"
                icon={FolderIcon}
                text="No storage provisions have been created"
                onButtonPress={() =>
                  setModalData({
                    userStorageProvision: {
                      accessKeyHashId: '',
                      bucket: '',
                      description: '',
                      accessKeyId: '',
                      endpoint: '',
                      id: '',
                      label: '',
                      provisionTypes: [],
                      region: '',
                      prefix: '',
                    },
                    mutationType: 'CREATE',
                  })
                }
              />
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}
