'use client'

import { ColumnDef } from '@tanstack/react-table'

import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { invertColour, stringToColour } from '../../../../utils/colors'
import { AppDTO } from '@stellariscloud/api-client'
import Link from 'next/link'

export const serverAppsTableColumns: ColumnDef<AppDTO>[] = [
  {
    id: '__HIDDEN__',
    cell: ({ row }) => {
      return (
        <div className="w-0 h-0 overflow-hidden max-w-0">
          <Link
            href={`/server/apps/${row.original.identifier.toLowerCase()}`}
            className="absolute top-0 bottom-0 left-0 right-0"
          />
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
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
        <div className="flex gap-4 items-center font-normal">
          <div
            className="flex items-center justify-center rounded-full w-8 h-8 overflow-hidden"
            style={{
              background: stringToColour(row.original.identifier),
              color: invertColour(stringToColour(row.original.identifier)),
            }}
          >
            <span className="uppercase">
              {row.original.identifier?.[0] ?? '?'}
            </span>
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
        <span className="max-w-[400px] truncate text-muted-foreground text-xs">
          {row.original.publicKey}
        </span>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
