'use client'

import type { AccessKeyDTO } from '@stellariscloud/api-client'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'

export const userAccessKeysTableColumns: ColumnDef<AccessKeyDTO>[] = [
  {
    id: '__HIDDEN__',
    cell: ({ row }) => {
      return (
        <div className="size-0 max-w-0 overflow-hidden">
          <Link
            to={`/access-keys/${row.original.accessKeyHashId}`}
            className="absolute inset-0"
          />
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'hashId',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="HashId"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="w-[80px] truncate">{row.original.accessKeyHashId}</div>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'accessKeyId',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Access Key Id"
      />
    ),
    cell: ({ row: { original: accessKey } }) => {
      return (
        <div className="flex items-center gap-2 font-normal">
          {accessKey.accessKeyId}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'endpointDomain',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Endpoint"
      />
    ),
    cell: ({ row: { original: accessKey } }) => {
      return (
        <div className="flex items-center gap-2 font-normal">
          {accessKey.endpointDomain}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'region',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Region"
      />
    ),
    cell: ({ row: { original: accessKey } }) => {
      return (
        <div className="flex items-center gap-2 font-normal">
          {accessKey.region}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
]
