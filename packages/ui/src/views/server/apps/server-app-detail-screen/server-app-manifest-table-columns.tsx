'use client'

import type { AppDTOManifestInner } from '@stellariscloud/types'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { formatBytes } from '@stellariscloud/utils'
import type { ColumnDef } from '@tanstack/react-table'

export const serverAppManifestTableColumns: ColumnDef<AppDTOManifestInner>[] = [
  {
    accessorKey: 'path',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Path"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="truncate font-mono">{row.original.path}</div>
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'hash',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Hash"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="w-[100px] truncate font-mono">{row.original.hash}</div>
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'size',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Size"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="w-[80px] truncate font-mono">
          {formatBytes(row.original.size)}
        </div>
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
]
