import type { FolderDTO } from '@lombokapp/types'
import { Badge } from '@lombokapp/ui-toolkit/components/badge/badge'
import type { HideableColumnDef } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import { DataTableColumnHeader } from '@lombokapp/ui-toolkit/components/data-table/data-table-column-header'
import { FolderIcon } from 'lucide-react'

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
      <div className="flex items-center gap-2">
        <FolderIcon className="size-4" />
        <span>{row.original.folder.name}</span>
        {row.original.folder.accessError && (
          <Badge variant="destructive" className="ml-2 text-[10px]">
            {row.original.folder.accessError.code}
          </Badge>
        )}
      </div>
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
