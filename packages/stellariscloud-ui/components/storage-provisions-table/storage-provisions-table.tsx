import { StorageProvisionDTO } from '@stellariscloud/api-client'
import { DataTable } from '@stellariscloud/ui-toolkit'
import { storageProvisionsTableColumns } from './storage-provisions-table-columns'

export function StorageProvisionsTable({
  storageProvisions,
  onEdit,
  onDelete,
}: {
  storageProvisions: StorageProvisionDTO[]
  onEdit: (l: StorageProvisionDTO) => void
  onDelete: (l: StorageProvisionDTO) => void
}) {
  return (
    <DataTable
      data={storageProvisions ?? []}
      columns={storageProvisionsTableColumns}
    />
  )
}
