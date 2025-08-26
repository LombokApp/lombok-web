import type { AppDTO } from '@lombokapp/types'
import { DataTableColumnHeader } from '@lombokapp/ui-toolkit/src/components/data-table/data-table-column-header'
import type { ColumnDef } from '@tanstack/react-table'

export const appContributorUiTableColumns: ColumnDef<AppDTO['ui'][number]>[] = [
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
    accessorKey: 'hash',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Content hash"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="truncate">{row.original.hash}</div>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'description',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Description"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'files',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Files"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="truncate">
          ({Object.keys(row.original.files).length}){' '}
          {Object.keys(row.original.files)
            .map((filePath) =>
              filePath.slice(`/ui/${row.original.identifier}`.length + 1),
            )
            .join(', ')}
        </div>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
