import type { ConnectedAppWorkersDTO } from '@lombokapp/types'
import { DataTableColumnHeader } from '@lombokapp/ui-toolkit/components/data-table/data-table-column-header'
import type { ColumnDef } from '@tanstack/react-table'

export const serverConnectedAppWorkersTableColumns: ColumnDef<ConnectedAppWorkersDTO>[] =
  [
    {
      accessorKey: 'appIdentifier',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="App Identifier"
        />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <div className="w-[80px] truncate">
            {row.original.appIdentifier.toUpperCase()}
          </div>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'workerId',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Worker ID"
        />
      ),
      cell: ({ row: { original: appWorker } }) => {
        return (
          <div className="flex items-center gap-2 font-normal">
            {appWorker.workerId}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'IP',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="IP"
        />
      ),
      cell: ({ row: { original: appWorker } }) => {
        return (
          <div className="flex items-center gap-2 font-normal">
            {appWorker.ip}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
  ]
