import { UserStorageProvisionDTO } from '@stellariscloud/api-client'
import { DataTable } from '@stellariscloud/ui-toolkit'
import { userStorageProvisionsTableColumns } from './user-storage-provisions-table-columns'

export function UserStorageProvisionsTable({
  userStorageProvisions,
  onEdit,
  onDelete,
}: {
  userStorageProvisions: UserStorageProvisionDTO[]
  onEdit: (l: UserStorageProvisionDTO) => void
  onDelete: (l: UserStorageProvisionDTO) => void
}) {
  return (
    <DataTable
      data={userStorageProvisions ?? []}
      columns={userStorageProvisionsTableColumns}
    />
  )
}
