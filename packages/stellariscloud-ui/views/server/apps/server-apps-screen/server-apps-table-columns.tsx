'use client'

import type { AppDTO } from '@stellariscloud/api-client'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'

import { invertColour, stringToColour } from '../../../../utils/colors'

export const serverAppsTableColumns: ColumnDef<AppDTO>[] = [
  {
    id: '__HIDDEN__',
    cell: ({ row }) => {
      return (
        <div className="size-0 max-w-0 overflow-hidden">
          <Link
            href={`/server/apps/${row.original.identifier.toLowerCase()}`}
            className="absolute inset-0"
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
        <span className="text-muted-foreground max-w-[400px] truncate text-xs">
          {row.original.publicKey}
        </span>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
