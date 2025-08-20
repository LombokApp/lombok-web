import type { StorageProvisionDTO } from '@stellariscloud/types'
import { Button } from '@stellariscloud/ui-toolkit'
import { Folder, Plus } from 'lucide-react'
import React from 'react'

import { EmptyState } from '@/src/components/empty-state/empty-state'
import { StorageProvisionsTable } from '@/src/components/storage-provisions-table/storage-provisions-table'
import { $api } from '@/src/services/api'

import type { MutationType } from './storage-provision-form/storage-provision-form'
import { StorageProvisionModal } from './storage-provision-modal'

export function UserStorageProvisions({
  openRotateModal,
  refreshKey,
}: {
  openRotateModal: (accessKey: {
    accessKeyHashId: string
    accessKeyId: string
    endpoint: string
    region: string
  }) => void
  refreshKey: string
}) {
  const [modalData, setModalData] = React.useState<{
    storageProvision: StorageProvisionDTO | undefined
    mutationType: MutationType
  }>({
    storageProvision: undefined,
    mutationType: 'CREATE',
  })

  const { data: storageProvisions, refetch: refetchStorageProvisions } =
    $api.useQuery('get', '/api/v1/server/storage-provisions')

  const addStorageProvisionMutation = $api.useMutation(
    'post',
    '/api/v1/server/storage-provisions',
    {
      onSuccess: () => refetchStorageProvisions(),
    },
  )

  const updateStorageProvisionMutation = $api.useMutation(
    'put',
    '/api/v1/server/storage-provisions/{storageProvisionId}',
    {
      onSuccess: () => refetchStorageProvisions(),
    },
  )

  React.useEffect(() => {
    void refetchStorageProvisions()
  }, [refetchStorageProvisions, refreshKey])

  const handleUpdate = React.useCallback(
    (storageProvision: StorageProvisionDTO) => {
      setModalData({
        mutationType: 'UPDATE',
        storageProvision,
      })
    },
    [],
  )

  return (
    <div className="w-full">
      <StorageProvisionModal
        onSubmit={async (mutationType, values) => {
          if (mutationType === 'CREATE') {
            await addStorageProvisionMutation.mutateAsync({
              body: values,
            })
          } else if (modalData.storageProvision) {
            await updateStorageProvisionMutation.mutateAsync({
              params: {
                path: {
                  storageProvisionId: modalData.storageProvision.id,
                },
              },
              body: values,
            })
          }
        }}
        setModalData={setModalData}
        modalData={modalData}
      />
      <dl className="divide-y divide-gray-100 dark:divide-gray-700">
        <div className="flex flex-col sm:gap-4">
          <dd className="mt-1 text-sm leading-6 sm:col-span-5 sm:mt-0">
            {(storageProvisions?.result.length ?? 0) > 0 ? (
              <div className="flex flex-col items-start gap-4">
                <div className="w-full">
                  <StorageProvisionsTable
                    storageProvision={storageProvisions?.result ?? []}
                    onUpdate={handleUpdate}
                    openRotateModal={openRotateModal}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setModalData({
                      storageProvision: {
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
                  <Plus className="size-5" />
                  Add Storage Provision
                </Button>
              </div>
            ) : (
              <EmptyState
                buttonText="Add storage provision"
                icon={Folder}
                text="No storage provisions have been created"
                onButtonPress={() => {
                  // open create provision modal
                  setModalData({
                    storageProvision: {
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
