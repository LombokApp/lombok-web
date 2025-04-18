import { FolderIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { UserStorageProvisionDTO } from '@stellariscloud/api-client'
import { Button } from '@stellariscloud/ui-toolkit'
import React from 'react'

import { UserStorageProvisionsTable } from '../../../../../components/user-storage-provisions-table/user-storage-provisions-table'
import { EmptyState } from '../../../../../design-system/empty-state/empty-state'
import {
  apiClient,
  userStorageProvisionsApiHooks,
} from '../../../../../services/api'
import type { UserStorageProvisionFormValues } from './user-storage-provision-form/user-storage-provision-form'
import type { MutationType } from './user-storage-provision-modal'
import { UserStorageProvisionModal } from './user-storage-provision-modal'

export function UserStorageProvisions() {
  const [modalData, setModalData] = React.useState<{
    userStorageProvision: UserStorageProvisionDTO | undefined
    mutationType: MutationType
  }>({
    userStorageProvision: undefined,
    mutationType: 'CREATE',
  })

  const userStorageProvisionsQuery =
    userStorageProvisionsApiHooks.useListUserStorageProvisions({})

  const handleAddStorageProvision = React.useCallback(
    (input: UserStorageProvisionFormValues) =>
      apiClient.userStorageProvisionsApi
        .createUserStorageProvision({
          userStorageProvisionInputDTO: {
            ...input,
          },
        })
        .then(() => userStorageProvisionsQuery.refetch()),
    [userStorageProvisionsQuery],
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
        .then(() => userStorageProvisionsQuery.refetch()),
    [userStorageProvisionsQuery],
  )

  const _handleDeleteStorageProvision = React.useCallback(
    (userStorageProvisionId: string) =>
      apiClient.userStorageProvisionsApi
        .deleteUserStorageProvision({
          userStorageProvisionId,
        })
        .then(() => userStorageProvisionsQuery.refetch()),
    [userStorageProvisionsQuery],
  )

  // Define the update handler to pass to the table
  const handleUpdate = React.useCallback(
    (userStorageProvision: UserStorageProvisionDTO) => {
      setModalData({ mutationType: 'UPDATE', userStorageProvision })
      // fetchProvisions() // Refetch data on update
    },
    [],
  )

  return (
    <div className="w-full">
      <UserStorageProvisionModal
        onSubmit={async (mutationType, values) => {
          if (mutationType === 'CREATE') {
            await handleAddStorageProvision(values)
          }
        }}
        setModalData={setModalData}
        modalData={modalData}
      />
      <dl className="divide-y divide-gray-100 dark:divide-gray-700">
        <div className="flex flex-col sm:gap-4">
          <dd className="mt-1 text-sm leading-6 sm:col-span-5 sm:mt-0">
            {(userStorageProvisionsQuery.data?.result.length ?? 0) > 0 ? (
              <div className="flex flex-col items-start gap-4">
                <div className="w-full">
                  <UserStorageProvisionsTable
                    userStorageProvisions={
                      userStorageProvisionsQuery.data?.result ?? []
                    }
                    onUpdate={handleUpdate}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
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
                  }}
                >
                  <PlusIcon className="size-5" />
                  Add Storage Provision
                </Button>
              </div>
            ) : (
              <EmptyState
                buttonText="Add storage provision"
                icon={FolderIcon}
                text="No storage provisions have been created"
                onButtonPress={() => {
                  // TODO: Update add provision logic
                  console.log(
                    'Add provision button clicked - functionality needs update',
                  )
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
                }}
              />
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}
