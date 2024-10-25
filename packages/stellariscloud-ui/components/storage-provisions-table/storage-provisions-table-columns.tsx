'use client'

import { ColumnDef } from '@tanstack/react-table'

import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { DataTableRowActions, cn } from '@stellariscloud/ui-toolkit'
import { invertColour, stringToColour } from '../../utils/colors'
import { useRouter } from 'next/router'
import { StorageProvisionDTO } from '@stellariscloud/api-client'

export const storageProvisionsTableColumns: ColumnDef<StorageProvisionDTO>[] = [
  {
    accessorKey: 'accessKeyId_',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Access Key Id"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="w-[80px] truncate">{row.original.accessKeyId}</div>
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
                router.push(`/server/storage-provisions/${row.original.id}`),
            },
          ]}
          row={row}
        />
      )
    },
  },
]
