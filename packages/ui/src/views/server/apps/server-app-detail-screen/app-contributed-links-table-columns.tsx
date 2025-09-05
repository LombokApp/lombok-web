import { DataTableColumnHeader } from '@lombokapp/ui-toolkit/src/components/data-table/data-table-column-header'
import type { ColumnDef } from '@tanstack/react-table'

export const appContributedRouteLinksTableColumns: ColumnDef<{
  path: string
  iconPath?: string
  label: string
}>[] = [
  {
    accessorKey: 'label',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Label"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="truncate">{row.original.label}</div>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'iconPath',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Icon Path"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="truncate">{row.original.iconPath}</div>
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
