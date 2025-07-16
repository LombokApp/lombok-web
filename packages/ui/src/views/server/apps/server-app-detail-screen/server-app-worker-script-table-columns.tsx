'use client'

import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import type { ColumnDef } from '@tanstack/react-table'

import type { AppDTO } from '@/src/services/api'

export const serverAppWorkerScriptTableColumns: ColumnDef<
  AppDTO['workerScripts'][0]
>[] = [
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
        <div className="truncate">{row.original.identifier}</div>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'description',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Description"
      />
    ),
    cell: ({ row: { original: appWorker } }) => {
      return (
        <div className="flex items-center gap-2 font-normal">
          {appWorker.description}
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
        title="Files"
      />
    ),
    cell: ({ row: { original: appWorker } }) => {
      return (
        <div className="flex items-center gap-2 font-normal">
          ({appWorker.files.length}){' '}
          {appWorker.files
            .map((file) => {
              const prefix = `/workers/${appWorker.identifier}/`
              return file.path.startsWith(prefix)
                ? file.path.slice(prefix.length)
                : file.path
            })
            .join(', ')}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
]
