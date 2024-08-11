import { FolderIcon, PlusIcon } from '@heroicons/react/24/outline'
import React from 'react'

import { Button } from '../../../../design-system/button/button'
import { EmptyState } from '../../../../design-system/empty-state/empty-state'
import { apiClient } from '../../../../services/api'
import type { StorageProvisionFormValues } from './storage-provision-form/storage-provision-form'
import { StorageProvisionForm } from './storage-provision-form/storage-provision-form'
import { StorageProvisionDTO } from '@stellariscloud/api-client'
import { StorageProvisionsList } from '../../../../components/storage-provisions-list/storage-provisions-list'

export function ServerStorageProvisions() {
  const [storageProvisions, setStorageProvisions] =
    React.useState<StorageProvisionDTO[]>()

  const [editingStorageProvision, setEditingStorageProvision] = React.useState<
    Partial<{
      storageProvision: StorageProvisionDTO
      mutationType: 'CREATE' | 'UPDATE'
    }>
  >()

  const handleAddStorageProvision = React.useCallback(
    (input: StorageProvisionFormValues) =>
      apiClient.storageProvisionsApi
        .createServerProvision({
          storageProvisionInputDTO: {
            ...input,
          },
        })
        .then((resp) => {
          setStorageProvisions(resp.data.result)
        }),
    [],
  )

  const handleUpdateStorageProvision = React.useCallback(
    (
      storageProvision: StorageProvisionDTO,
      input: StorageProvisionFormValues,
    ) =>
      apiClient.storageProvisionsApi
        .updateStorageProvision({
          storageProvisionId: storageProvision.id,
          storageProvisionInputDTO: {
            ...input,
          },
        })
        .then((resp) => setStorageProvisions(resp.data.result)),
    [],
  )

  const handleDeleteStorageProvision = React.useCallback(
    (storageProvisionId: string) =>
      apiClient.storageProvisionsApi
        .deleteStorageProvision({
          storageProvisionId,
        })
        .then((resp) => {
          setStorageProvisions(resp.data.result)
        }),
    [],
  )

  React.useEffect(() => {
    void apiClient.storageProvisionsApi.listStorageProvisions().then((resp) => {
      setStorageProvisions(resp.data.result)
    })
  }, [])

  return (
    <div className="w-full">
      <dl className="divide-y divide-gray-100 dark:divide-gray-700">
        <div className="px-4 py-6 flex flex-col sm:gap-4 sm:px-0">
          <dt className="text-sm font-medium leading-6 text-gray-900 dark:text-gray-200 sm:col-span-3">
            <span className="text-xl">Storage Provisions</span>
            <div className="mt-1 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:mt-0">
              Designate S3 locations that a user can nominate as storage for new
              folders. Without entries here your users can only create folders
              by providing their own credentials to a working S3-compatible
              service.
            </div>
            <div className="pt-2 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:mt-0"></div>
          </dt>
          <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-5 sm:mt-0">
            {editingStorageProvision ? (
              <StorageProvisionForm
                value={editingStorageProvision.storageProvision}
                titleText={
                  editingStorageProvision.mutationType === 'CREATE'
                    ? 'Create storage provision'
                    : 'Update storage provision'
                }
                onSubmit={(values) =>
                  (editingStorageProvision.mutationType === 'CREATE'
                    ? handleAddStorageProvision(values)
                    : handleUpdateStorageProvision(
                        editingStorageProvision.storageProvision as StorageProvisionDTO,
                        values,
                      )
                  ).then(() => setEditingStorageProvision(undefined))
                }
                submitText={
                  editingStorageProvision.mutationType === 'CREATE'
                    ? 'Create'
                    : 'Save'
                }
                onCancel={() => setEditingStorageProvision(undefined)}
              />
            ) : (storageProvisions?.length ?? 0) > 0 ? (
              <div className="flex flex-col gap-4 items-start">
                <StorageProvisionsList
                  storageProvisions={storageProvisions ?? []}
                  onEdit={(storageProvision) =>
                    setEditingStorageProvision({
                      storageProvision,
                      mutationType: 'UPDATE',
                    })
                  }
                  onDelete={(storageProvision) =>
                    handleDeleteStorageProvision(storageProvision.id)
                  }
                />
                <Button
                  primary
                  icon={PlusIcon}
                  onClick={() =>
                    setEditingStorageProvision({
                      storageProvision: undefined,
                      mutationType: 'CREATE',
                    })
                  }
                >
                  Add Storage Provision
                </Button>
              </div>
            ) : (
              <EmptyState
                buttonText="Add storage provision"
                icon={FolderIcon}
                text="No storage provisions have been created"
                onButtonPress={() =>
                  setEditingStorageProvision({
                    storageProvision: undefined,
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
