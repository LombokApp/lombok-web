import type {
  ServerStorageLocationDTO,
  ServerStorageLocationInputDTO,
} from '@stellariscloud/api-client'
import { FolderIcon } from 'lucide-react'
import React from 'react'

import { EmptyState } from '../../../../../design-system/empty-state/empty-state'
import { apiClient } from '../../../../../services/api'
import { ServerStorageLocationCard } from './server-storage-location-card'
import { ServerStorageLocationModal } from './server-storage-location-modal'
import { ServerStorageLocationRemoveModal } from './server-storage-location-remove-modal'

export function ServerStorageLocation() {
  const [serverStorageLocation, setServerStorageLocation] =
    React.useState<ServerStorageLocationDTO>()
  const [serverStorageLocationModalData, setServerStorageLocationModalData] =
    React.useState<{ open: boolean }>({ open: false })
  const [
    serverStorageLocationRemoveModalData,
    setServerStorageLocationRemoveModalData,
  ] = React.useState<{ open: boolean }>({ open: false })

  const handleSetServerStorageLocation = React.useCallback(
    (input: ServerStorageLocationInputDTO) =>
      apiClient.serverStorageLocationApi
        .setServerStorageLocation({
          serverStorageLocationInputDTO: {
            ...input,
            region: input.region,
            prefix: input.prefix ?? null,
          },
        })
        .then((resp) => {
          setServerStorageLocationModalData({ open: false })
          setServerStorageLocation(resp.data.serverStorageLocation)
        }),
    [],
  )

  const handleDeleteServerStorageLocation = React.useCallback(
    () =>
      apiClient.serverStorageLocationApi
        .deleteServerStorageLocation()
        .then(() => {
          setServerStorageLocationRemoveModalData({ open: false })
          setServerStorageLocation(undefined)
        }),
    [],
  )

  React.useEffect(() => {
    void apiClient.serverStorageLocationApi
      .getServerStorageLocation()
      .then((resp) => {
        setServerStorageLocation(resp.data.serverStorageLocation)
      })
  }, [])

  return (
    <>
      <ServerStorageLocationModal
        modalData={serverStorageLocationModalData}
        setModalData={setServerStorageLocationModalData}
        onSubmit={handleSetServerStorageLocation}
      />
      <ServerStorageLocationRemoveModal
        modalData={serverStorageLocationRemoveModalData}
        setModalData={setServerStorageLocationRemoveModalData}
        onConfirm={handleDeleteServerStorageLocation}
      />

      {serverStorageLocation ? (
        <ServerStorageLocationCard
          onRemoveClick={() =>
            setServerStorageLocationRemoveModalData({
              open: true,
            })
          }
          serverStorageLocation={serverStorageLocation}
        />
      ) : (
        <EmptyState
          buttonText="Add location"
          icon={FolderIcon}
          text="No server storage location has been set"
          onButtonPress={() =>
            setServerStorageLocationModalData({ open: true })
          }
        />
      )}
    </>
  )
}
