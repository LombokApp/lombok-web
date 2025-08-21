import type { StorageProvisionDTO } from '@stellariscloud/types'
import { DataTable } from '@stellariscloud/ui-toolkit'
import React from 'react'

import { storageProvisionsTableColumns } from './storage-provisions-table-columns'

export function StorageProvisionsTable({
  storageProvision,
  onUpdate,
  openRotateModal,
  onDelete,
}: {
  storageProvision: StorageProvisionDTO[]
  onUpdate: (storageProvision: StorageProvisionDTO) => void
  openRotateModal: (accessKey: {
    accessKeyHashId: string
    accessKeyId: string
    endpoint: string
    region: string
  }) => void
  onDelete: (storageProvision: StorageProvisionDTO) => void
}) {
  const columns = React.useMemo(
    () => storageProvisionsTableColumns(onUpdate, openRotateModal, onDelete),
    [onUpdate, openRotateModal, onDelete],
  )

  return <DataTable data={storageProvision} columns={columns} />
}
