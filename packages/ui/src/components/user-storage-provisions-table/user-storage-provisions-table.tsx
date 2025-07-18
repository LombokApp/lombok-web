import type { UserStorageProvisionDTO } from '@stellariscloud/types'
import { DataTable } from '@stellariscloud/ui-toolkit'
import React from 'react'

import { userStorageProvisionsTableColumns } from './user-storage-provisions-table-columns'

export function UserStorageProvisionsTable({
  userStorageProvisions,
  onUpdate,
}: {
  userStorageProvisions: UserStorageProvisionDTO[]
  onUpdate: (userStorageProvision: UserStorageProvisionDTO) => void
}) {
  const columns = React.useMemo(
    () => userStorageProvisionsTableColumns(onUpdate),
    [onUpdate],
  )

  return <DataTable data={userStorageProvisions} columns={columns} />
}
