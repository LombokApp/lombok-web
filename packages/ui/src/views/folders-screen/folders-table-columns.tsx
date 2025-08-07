import type { FolderDTO } from '@stellariscloud/types'
import type { HideableColumnDef } from '@stellariscloud/ui-toolkit'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'

import { DateDisplay } from '@/src/components/date-display'

import { TableLinkColumn } from '../../components/table-link-column/table-link-column'

export const foldersTableColumns: HideableColumnDef<{
  folder: FolderDTO
  permissions: string[]
}>[] = [
  {
    id: 'link',
    cell: ({ row }) => (
      <TableLinkColumn to={`/folders/${row.original.folder.id}`} />
    ),
    enableSorting: false,
    zeroWidth: true,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Name"
      />
    ),
    cell: ({ row }) => (
      <div className="flex items-start gap-2">{row.original.folder.name}</div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Created"
      />
    ),
    cell: ({ row }) => (
      <div className="text-xs">
        <DateDisplay date={row.original.folder.createdAt} />
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Updated"
      />
    ),
    cell: ({ row }) => (
      <div className="text-xs">
        <DateDisplay date={row.original.folder.updatedAt} />
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
]
