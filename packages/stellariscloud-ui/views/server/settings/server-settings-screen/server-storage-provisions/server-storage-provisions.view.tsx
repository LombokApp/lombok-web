import { FolderIcon, PlusIcon } from '@heroicons/react/24/outline'
import React from 'react'

import { Button } from '@stellariscloud/ui-toolkit'
import { EmptyState } from '../../../../../design-system/empty-state/empty-state'
import { apiClient } from '../../../../../services/api'
import type { StorageProvisionFormValues } from './storage-provision-form/storage-provision-form'
import { StorageProvisionForm } from './storage-provision-form/storage-provision-form'
import { StorageProvisionDTO } from '@stellariscloud/api-client'
import { StorageProvisionsList } from '../../../../../components/storage-provisions-list/storage-provisions-list'

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
        <div className="flex flex-col sm:gap-4">
          <dd className="mt-1 text-sm leading-6 sm:col-span-5 sm:mt-0">
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
                  onClick={() =>
                    setEditingStorageProvision({
                      storageProvision: undefined,
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
