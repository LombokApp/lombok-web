import { FolderIcon, PlusCircleIcon } from '@heroicons/react/24/outline'
import React from 'react'

import { Button } from '../../../../design-system/button/button'
import { EmptyState } from '../../../../design-system/empty-state/empty-state'
import { apiClient } from '../../../../services/api'
import type { StorageProvisionFormValues } from './storage-provision-form/storage-provision-form'
import { StorageProvisionForm } from './storage-provision-form/storage-provision-form'
import { StorageProvisionDTO } from '@stellariscloud/api-client'
import { StorageProvisionsTable } from '../../../../components/storage-provisions-table/storage-provisions-table'

export function ServerStorageConfig() {
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
    <div className="">
      <dl className="divide-y divide-gray-100 dark:divide-gray-700">
        <div className="px-4 py-6 sm:grid sm:grid-cols-8 sm:gap-4 sm:px-0">
          <dt className="text-sm font-medium leading-6 text-gray-900 dark:text-gray-200 sm:col-span-3">
            <span className="text-xl">Storage Provisions</span>
            <div className="mt-1 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:mt-0">
              Designate S3 locations that can be used to store your users' data.
            </div>
            <div className="pt-2 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:mt-0">
              Without entries here your users can only create folders by
              providing their own credentials to a working S3-compatible
              service.
            </div>
            <div className="text-xs">
              <code className="mt-2 inline-flex text-left items-center space-x-4 bg-gray-800 text-white rounded-lg p-4 pl-6">
                <span className="flex-1">
                  <span className="opacity-50">
                    Data stored in these locations will be prefixed by a known
                    key and the id of the folder.
                  </span>
                  <span>
                    <br />
                    <br />
                  </span>
                  <span className="opacity-50">e.g: &lt;yourLocation&gt;</span>
                  <span>/</span>
                  <span>.stellaris_folder_content_&lt;folderId&gt;</span>
                  <span>/</span>
                </span>
              </code>
            </div>
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
                <StorageProvisionsTable
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
                  icon={PlusCircleIcon}
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
