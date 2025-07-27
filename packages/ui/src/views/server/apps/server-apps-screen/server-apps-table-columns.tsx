'use client'

import type { AppDTO } from '@stellariscloud/types'
import type { HideableColumnDef } from '@stellariscloud/ui-toolkit'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'

import { TableLinkColumn } from '../../../../components/table-link-column/table-link-column'
import { invertColour, stringToColour } from '../../../../utils/colors'

export const serverAppsTableColumns: HideableColumnDef<AppDTO>[] = [
  {
    id: 'link',
    cell: ({ row }) => (
      <TableLinkColumn
        to={`/server/apps/${row.original.identifier.toLowerCase()}`}
      />
    ),
    enableSorting: false,
    zeroWidth: true,
  },
  {
    accessorKey: 'identifier',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Name"
      />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-4 font-normal">
          <div
            className="flex size-8 items-center justify-center overflow-hidden rounded-full"
            style={{
              background: stringToColour(row.original.identifier),
              color: invertColour(stringToColour(row.original.identifier)),
            }}
          >
            <span className="uppercase">{row.original.identifier[0]}</span>
          </div>

          <span>{row.original.identifier.toUpperCase()}</span>
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
        <span className="max-w-[400px] truncate text-xs text-muted-foreground">
          {row.original.publicKey}
        </span>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
