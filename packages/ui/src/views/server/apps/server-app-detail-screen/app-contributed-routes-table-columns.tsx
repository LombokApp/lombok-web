import type { AppContributions } from '@lombokapp/types'
import { DataTableColumnHeader } from '@lombokapp/ui-toolkit/src/components/data-table/data-table-column-header'
import type { ColumnDef } from '@tanstack/react-table'

export const appContributedRoutesTableColumns: ColumnDef<
  AppContributions['routes'][string] & { identifier: string }
>[] = [
  {
    accessorKey: 'identifier',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Identifier"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="truncate">{row.original.identifier}</div>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'uiIdentifier',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="UI Identifier"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="truncate">{row.original.uiIdentifier}</div>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
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
        <div className="truncate">{row.original.path}</div>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
