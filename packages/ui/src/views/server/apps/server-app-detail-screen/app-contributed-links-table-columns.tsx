import type { Icon } from '@lombokapp/types'
import { DataTableColumnHeader } from '@lombokapp/ui-toolkit/components/data-table/data-table-column-header'
import type { ColumnDef } from '@tanstack/react-table'

import { AppIcon } from '@/src/components/app-icon/app-icon'

export const appContributedRouteLinksTableColumns: ColumnDef<{
  path: string
  icon?: Icon
  label: string
  appIdentifier: string
}>[] = [
  {
    id: 'icon',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Icon"
      />
    ),
    cell: ({ row }) => (
      <div className="flex items-center">
        <AppIcon
          icon={row.original.icon}
          appIdentifier={row.original.appIdentifier}
          fallbackLabel={row.original.label}
          size={20}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
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
