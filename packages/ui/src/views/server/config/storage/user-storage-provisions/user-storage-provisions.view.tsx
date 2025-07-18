import { FolderIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { UserStorageProvisionDTO } from '@stellariscloud/types'
import { Button } from '@stellariscloud/ui-toolkit'
import React from 'react'

import { UserStorageProvisionsTable } from '@/src/components/user-storage-provisions-table/user-storage-provisions-table'
import { EmptyState } from '@/src/design-system/empty-state/empty-state'
import { $api } from '@/src/services/api'

import type { MutationType } from './user-storage-provision-form/user-storage-provision-form'
import { UserStorageProvisionModal } from './user-storage-provision-modal'

export function UserStorageProvisions() {
  const [modalData, setModalData] = React.useState<{
    userStorageProvision: UserStorageProvisionDTO | undefined
    mutationType: MutationType
  }>({
    userStorageProvision: undefined,
    mutationType: 'CREATE',
  })

  const userStorageProvisionsQuery = $api.useQuery(
    'get',
    '/api/v1/server/user-storage-provisions',
  )

  const addStorageProvisionMutation = $api.useMutation(
    'post',
    '/api/v1/server/user-storage-provisions',
    {
      onSuccess: () => userStorageProvisionsQuery.refetch(),
    },
  )

  const updateStorageProvisionMutation = $api.useMutation(
    'put',
    '/api/v1/server/user-storage-provisions/{userStorageProvisionId}',
    {
      onSuccess: () => userStorageProvisionsQuery.refetch(),
    },
  )
  // TODO: Delete storage provision mutation (add ui to modal)
  const _deleteStorageProvisionMutation = $api.useMutation(
    'delete',
    '/api/v1/server/user-storage-provisions/{userStorageProvisionId}',
    {
      onSuccess: () => userStorageProvisionsQuery.refetch(),
    },
  )

  // Define the update handler to pass to the table
  const handleUpdate = React.useCallback(
    (userStorageProvision: UserStorageProvisionDTO) => {
      setModalData({ mutationType: 'UPDATE', userStorageProvision })
    },
    [],
  )

  return (
    <div className="w-full">
      <UserStorageProvisionModal
        onSubmit={async (mutationType, values) => {
          if (mutationType === 'CREATE') {
            await addStorageProvisionMutation.mutateAsync({
              body: values,
            })
          } else if (modalData.userStorageProvision) {
            await updateStorageProvisionMutation.mutateAsync({
              params: {
                path: {
                  userStorageProvisionId: modalData.userStorageProvision.id,
                },
              },
              body: {
                ...values,
                secretAccessKey: values.secretAccessKey.length
                  ? values.secretAccessKey
                  : undefined,
              },
            })
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
