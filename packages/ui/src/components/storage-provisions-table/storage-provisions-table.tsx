import type { StorageProvision } from '@lombokapp/types'
import { DataTable } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import React from 'react'

import { storageProvisionsTableColumns } from './storage-provisions-table-columns'

export function StorageProvisionsTable({
  storageProvision,
  onUpdate,
  openRotateModal,
  onDelete,
}: {
  storageProvision: StorageProvision[]
  onUpdate: (storageProvision: StorageProvision) => void
  openRotateModal: (accessKey: {
    accessKeyHashId: string
    accessKeyId: string
    endpoint: string
    region: string
  }) => void
  onDelete: (storageProvision: StorageProvision) => void
}) {
  const columns = React.useMemo(
    () => storageProvisionsTableColumns(onUpdate, openRotateModal, onDelete),
    [onUpdate, openRotateModal, onDelete],
  )

  return <DataTable data={storageProvision} columns={columns} />
}
