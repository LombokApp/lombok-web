import { Folder } from 'lucide-react'
import React from 'react'

import { EmptyState } from '@/src/components/empty-state/empty-state'
import { $api } from '@/src/services/api'

import { ServerStorageLocationCard } from './server-storage-location-card'
import { ServerStorageLocationModal } from './server-storage-location-modal'
import { ServerStorageLocationRemoveModal } from './server-storage-location-remove-modal'

export function ServerStorageLocation({
  refreshKey,
  openRotateModal,
}: {
  refreshKey: string
  openRotateModal: (accessKey: {
    accessKeyHashId: string
    accessKeyId: string
    endpoint: string
    region: string
  }) => void
}) {
  const [serverStorageLocationModalData, setServerStorageLocationModalData] =
    React.useState<{ open: boolean }>({ open: false })
  const [
    serverStorageLocationRemoveModalData,
    setServerStorageLocationRemoveModalData,
  ] = React.useState<{ open: boolean }>({ open: false })

  const { data: serverStorageLocation, refetch: refetchServerStorageLocation } =
    $api.useQuery('get', '/api/v1/server/server-storage')

  React.useEffect(() => {
    void refetchServerStorageLocation()
  }, [refetchServerStorageLocation, refreshKey])

  const setServerStorageLocationMutation = $api.useMutation(
    'post',
    '/api/v1/server/server-storage',
    {
      onSuccess: () => {
        setServerStorageLocationModalData({ open: false })
        void refetchServerStorageLocation()
      },
    },
  )

  const deleteServerStorageLocationMutation = $api.useMutation(
    'delete',
    '/api/v1/server/server-storage',
    {
      onSuccess: () => {
        setServerStorageLocationRemoveModalData({ open: false })
        void refetchServerStorageLocation()
      },
    },
  )

  return (
    <>
      <ServerStorageLocationModal
        modalData={serverStorageLocationModalData}
        setModalData={setServerStorageLocationModalData}
        onSubmit={async (input) => {
          await setServerStorageLocationMutation.mutateAsync({
            body: {
              ...input,
              region: input.region,
              prefix: input.prefix,
            },
          })
        }}
      />
      <ServerStorageLocationRemoveModal
        modalData={serverStorageLocationRemoveModalData}
        setModalData={setServerStorageLocationRemoveModalData}
        onConfirm={() => deleteServerStorageLocationMutation.mutateAsync({})}
      />
      {/* Rotation is handled by a shared modal at the tab level */}

      {serverStorageLocation?.serverStorageLocation ? (
        <ServerStorageLocationCard
          onRemoveClick={() =>
            setServerStorageLocationRemoveModalData({
              open: true,
            })
          }
          onRotateClick={() =>
            serverStorageLocation.serverStorageLocation
              ? openRotateModal({
                  accessKeyHashId:
                    serverStorageLocation.serverStorageLocation.accessKeyHashId,
                  accessKeyId:
                    serverStorageLocation.serverStorageLocation.accessKeyId,
                  endpoint:
                    serverStorageLocation.serverStorageLocation.endpoint,
                  region: serverStorageLocation.serverStorageLocation.region,
                })
              : undefined
          }
          serverStorageLocation={{
            ...serverStorageLocation.serverStorageLocation,
            prefix: serverStorageLocation.serverStorageLocation.prefix ?? '',
          }}
        />
      ) : (
        <EmptyState
          buttonText="Add location"
          icon={Folder}
          text="No server storage location has been set"
          onButtonPress={() =>
            setServerStorageLocationModalData({ open: true })
          }
        />
      )}
    </>
  )
}
