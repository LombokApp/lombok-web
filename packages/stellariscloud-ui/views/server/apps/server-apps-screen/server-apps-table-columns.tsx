'use client'

import { ColumnDef } from '@tanstack/react-table'

import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { invertColour, stringToColour } from '../../../../utils/colors'
import { AppDTO } from '@stellariscloud/api-client'
import { useRouter } from 'next/router'
import { DataTableRowActions } from '@stellariscloud/ui-toolkit'

export const serverAppsTableColumns: ColumnDef<AppDTO>[] = [
  {
    accessorKey: 'identifier',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Name"
      />
    ),
    cell: ({ row: { original: app } }) => {
      return (
        <div className="flex gap-4 items-center font-normal">
          <div
            className="flex items-center justify-center rounded-full w-8 h-8 overflow-hidden"
            style={{
              background: stringToColour(app.identifier),
              color: invertColour(stringToColour(app.identifier)),
            }}
          >
            <span className="uppercase">{app.identifier?.[0] ?? '?'}</span>
          </div>

          {app.identifier.toUpperCase()}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'publicKey',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Public Key"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="">{row.getValue('publicKey')}</div>
        <span className="max-w-[400px] truncate text-muted-foreground text-xs">
          {row.original.config.publicKey}
        </span>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const router = useRouter()
      return (
        <DataTableRowActions
          actions={[
            {
              label: 'View',
              value: 'view',
              isPinned: true,
              onClick: () =>
                router.push(`/server/apps/${row.original.identifier}`),
            },
          ]}
          row={row}
        />
      )
    },
  },
]
