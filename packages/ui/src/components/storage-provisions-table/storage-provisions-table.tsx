import type { StorageProvisionDTO } from '@stellariscloud/types'
import { DataTable } from '@stellariscloud/ui-toolkit'
import React from 'react'

import { storageProvisionsTableColumns } from './storage-provisions-table-columns'

export function StorageProvisionsTable({
  storageProvision,
  onUpdate,
}: {
  storageProvision: StorageProvisionDTO[]
  onUpdate: (storageProvision: StorageProvisionDTO) => void
}) {
  const columns = React.useMemo(
    () => storageProvisionsTableColumns(onUpdate),
    [onUpdate],
  )

  return <DataTable data={storageProvision} columns={columns} />
}
