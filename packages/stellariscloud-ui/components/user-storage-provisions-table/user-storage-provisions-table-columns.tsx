'use client'

import { ColumnDef } from '@tanstack/react-table'

import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { Badge } from '@stellariscloud/ui-toolkit'
import { UserStorageProvisionDTO } from '@stellariscloud/api-client'
import Link from 'next/link'

export const userStorageProvisionsTableColumns: ColumnDef<UserStorageProvisionDTO>[] =
  [
    {
      id: '__HIDDEN__',
      cell: ({ row }) => {
        return (
          <div className="w-0 h-0 overflow-hidden max-w-0">
            <Link
              href={`/server/storage/provisions/${row.original.id}`}
              className="absolute top-0 bottom-0 left-0 right-0"
            />
          </div>
        )
      },
    },
    {
      accessorKey: 'accessKeyHashId',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Access Key Hash Id"
        />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <div className="w-[150px] truncate">
            {row.original.accessKeyHashId}
          </div>
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
      accessorKey: 'endpoint',
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
            {accessKey.endpoint}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'provisionTypes',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Provision Types"
        />
      ),
      cell: ({ row: { original: accessKey } }) => {
        return (
          <div className="flex gap-2 items-center font-normal">
            {accessKey.provisionTypes.map((provisionType) => (
              <Badge key={provisionType} variant={'outline'}>
                {provisionType}
              </Badge>
            ))}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'bucket_prefix',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Bucket / Prefix"
        />
      ),
      cell: ({ row: { original: accessKey } }) => {
        return (
          <div className="flex gap-1 font-normal">
            <span>{accessKey.bucket}</span>
            <span className="opacity-20">/</span>
            {!accessKey.prefix ? (
              <>
                <span className="">{accessKey.prefix}</span>
                <span className="opacity-20">/</span>
              </>
            ) : (
              <span className="italic opacity-20">None</span>
            )}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
  ]
