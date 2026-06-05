import type { Icon } from '@lombokapp/types'
import { DataTableColumnHeader } from '@lombokapp/ui-toolkit/components/data-table/data-table-column-header'
import type { ColumnDef } from '@tanstack/react-table'

import { AppIcon } from '@/src/components/app-icon/app-icon'

export interface AppContributedMobileScreenRow {
  identifier: string
  label: string
  title?: string
  icon?: Icon
  appIdentifier: string
  viewCount: number
}

export const appContributedMobileScreensTableColumns: ColumnDef<AppContributedMobileScreenRow>[] =
  [
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
          <code className="truncate font-mono text-xs">
            {row.original.identifier}
          </code>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Title"
        />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <div className="truncate text-muted-foreground">
            {row.original.title ?? row.original.label}
          </div>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'viewCount',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Views"
        />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <div className="truncate">
            {row.original.viewCount}{' '}
            {row.original.viewCount === 1 ? 'view' : 'views'}
          </div>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ]
