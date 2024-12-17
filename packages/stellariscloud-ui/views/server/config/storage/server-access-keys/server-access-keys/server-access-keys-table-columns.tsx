'use client'

import { ColumnDef } from '@tanstack/react-table'

import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { AccessKeyDTO } from '@stellariscloud/api-client'
import { useRouter } from 'next/router'
import { DataTableRowActions } from '@/components'
import Link from 'next/link'

export const serverAccessKeysTableColumns: ColumnDef<AccessKeyDTO>[] = [
  {
    id: '__HIDDEN__',
    cell: ({ row }) => {
      return (
        <div className="w-0 h-0 overflow-hidden max-w-0">
          <Link
            href={`/server/access-keys/${row.original.accessKeyHashId}`}
            className="absolute top-0 bottom-0 left-0 right-0"
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
        <div className="flex gap-2 items-center font-normal">
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
        <div className="flex gap-2 items-center font-normal">
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
        <div className="flex gap-2 items-center font-normal">
          {accessKey.region}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
]
