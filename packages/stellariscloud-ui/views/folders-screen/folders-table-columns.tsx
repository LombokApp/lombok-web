'use client'

import { ColumnDef } from '@tanstack/react-table'

import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { timeSinceOrUntil } from '@stellariscloud/utils'
import { EventDTO } from '@stellariscloud/api-client'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { DataTableRowActions, cn } from '@stellariscloud/ui-toolkit'
import { invertColour, stringToColour } from '../../utils/colors'
import { FolderDTO } from '@stellariscloud/api-client'

export const foldersTableColumns: ColumnDef<{
  folder: FolderDTO
  permissions: string[]
}>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Name"
      />
    ),
    cell: ({ row }) => (
      <div className="flex items-start gap-2">{row.original.folder.name}</div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Created"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col text-xs w-[140px]">
        <div>{new Date(row.original.folder.createdAt).toLocaleString()}</div>
        <div className="italic text-muted-foreground">
          {timeSinceOrUntil(new Date(row.original.folder.createdAt))}
        </div>
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Updated"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col text-xs w-[140px]">
        <div>{new Date(row.original.folder.updatedAt).toLocaleString()}</div>
        <div className="italic text-muted-foreground">
          {timeSinceOrUntil(new Date(row.original.folder.updatedAt))}
        </div>
      </div>
    ),
    enableSorting: true,
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
              onClick: () => router.push(`/folders/${row.original.folder.id}`),
            },
          ]}
          row={row}
        />
      )
    },
  },
]
