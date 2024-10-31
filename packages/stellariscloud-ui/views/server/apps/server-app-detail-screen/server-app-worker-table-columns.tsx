'use client'

import { ColumnDef } from '@tanstack/react-table'

import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { AppDTOConnectedWorkersInner } from '@stellariscloud/api-client'

export const serverAppWorkerTableColumns: ColumnDef<AppDTOConnectedWorkersInner>[] =
  [
    {
      accessorKey: 'appIdentifier',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="App Identifier"
        />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <div className="w-[80px] truncate">
            {row.original.appIdentifier.toUpperCase()}
          </div>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'workerId',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Worker ID"
        />
      ),
      cell: ({ row: { original: appWorker } }) => {
        return (
          <div className="flex gap-2 items-center font-normal">
            {appWorker.workerId}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'handledTaskKeys',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Handled Tasks"
        />
      ),
      cell: ({ row: { original: appWorker } }) => {
        return (
          <div className="flex gap-2 items-center font-normal">
            {appWorker.handledTaskKeys.join(', ')}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'IP',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="IP"
        />
      ),
      cell: ({ row: { original: appWorker } }) => {
        return (
          <div className="flex gap-2 items-center font-normal">
            {appWorker.ip}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
  ]
