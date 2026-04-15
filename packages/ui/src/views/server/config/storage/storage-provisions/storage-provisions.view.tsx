import type {
  StorageProvision,
  StorageProvisionInputDTO,
} from '@lombokapp/types'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { Folder, Plus } from 'lucide-react'
import React from 'react'

import { EmptyState } from '@/src/components/empty-state/empty-state'
import { StorageProvisionsTable } from '@/src/components/storage-provisions-table/storage-provisions-table'
import { $api } from '@/src/services/api'

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
  const [modalData, setModalData] = React.useState<
    | {
        storageProvision: Partial<StorageProvisionInputDTO>
        mutationType: 'CREATE'
        open: boolean
      }
    | {
        storageProvision: StorageProvision
        mutationType: 'UPDATE'
        open: boolean
      }
  >({
    storageProvision: {},
    mutationType: 'CREATE',
    open: false,
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

  const deleteStorageProvisionMutation = $api.useMutation(
    'delete',
    '/api/v1/server/storage-provisions/{storageProvisionId}',
    {
      onSuccess: () => refetchStorageProvisions(),
    },
  )

  React.useEffect(() => {
    void refetchStorageProvisions()
  }, [refetchStorageProvisions, refreshKey])

  const handleUpdate = React.useCallback(
    (storageProvision: StorageProvision) => {
      setModalData({
        mutationType: 'UPDATE',
        storageProvision,
        open: true,
      })
    },
    [],
  )

  const handleDelete = React.useCallback(
    (storageProvision: StorageProvision) => {
      void deleteStorageProvisionMutation.mutateAsync({
        params: {
          path: {
            storageProvisionId: storageProvision.id,
          },
        },
      })
    },
    [deleteStorageProvisionMutation],
  )

  return (
    <div className="w-full">
      <StorageProvisionModal
        onSubmit={async (payload) => {
          if (payload.mutationType === 'CREATE') {
            await addStorageProvisionMutation.mutateAsync({
              body: payload.values,
            })
          } else if (modalData.mutationType === 'UPDATE') {
            await updateStorageProvisionMutation.mutateAsync({
              params: {
                path: {
                  storageProvisionId: modalData.storageProvision.id,
                },
              },
              body: payload.values,
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
                    onDelete={handleDelete}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setModalData({
                      storageProvision: {
                        bucket: '',
                        accessKeyId: '',
                        description: '',
                        secretAccessKey: '',
                        endpoint: '',
                        label: '',
                        provisionTypes: [],
                        region: '',
                        prefix: null,
                      },
                      mutationType: 'CREATE',
                      open: true,
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
                      bucket: '',
                      description: '',
                      secretAccessKey: '',
                      accessKeyId: '',
                      endpoint: '',
                      label: '',
                      provisionTypes: [],
                      region: '',
                      prefix: null,
                    },
                    mutationType: 'CREATE',
                    open: true,
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
