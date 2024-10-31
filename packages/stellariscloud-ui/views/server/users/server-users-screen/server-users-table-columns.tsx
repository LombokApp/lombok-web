'use client'

import { ColumnDef } from '@tanstack/react-table'

import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { timeSinceOrUntil } from '@stellariscloud/utils'
import { invertColour, stringToColour } from '../../../../utils/colors'
import { UserDTO } from '@stellariscloud/api-client'
import Link from 'next/link'

export const serverUsersTableColumns: ColumnDef<UserDTO>[] = [
  {
    id: '__HIDDEN__',
    cell: ({ row }) => {
      return (
        <div className="w-0 h-0 overflow-hidden max-w-0">
          <Link
            href={`/server/users/${row.original.id}`}
            className="absolute top-0 bottom-0 left-0 right-0"
          />
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'icon',
    header: ({ column }) => (
      <DataTableColumnHeader
        title={'User'}
        canHide={column.getCanHide()}
        column={column}
      />
    ),
    cell: ({ row: { original: user } }) => (
      <div className="flex gap-4 items-start">
        <div
          className="flex items-center justify-center rounded-full w-8 h-8 overflow-hidden"
          style={{
            background: stringToColour(user.id),
            color: invertColour(stringToColour(user.id)),
          }}
        >
          <span className="uppercase">
            {user.name?.[0] ?? user.email?.[0] ?? '?'}
          </span>
        </div>
        <div className="flex flex-col">
          <div>{user.email}</div>
          <div>{user.username}</div>
        </div>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Name"
      />
    ),
    cell: ({ row: { original: user } }) => {
      return (
        <div className="flex gap-2 items-center font-normal">
          {user.name ? (
            user.name
          ) : (
            <span className="italic text-muted-foreground">None</span>
          )}
        </div>
      )
    },
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
        <div>{new Date(row.getValue('createdAt')).toLocaleString()}</div>
        <div className="italic text-muted-foreground">
          {timeSinceOrUntil(new Date(row.original.createdAt))}
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
        <div>{new Date(row.getValue('updatedAt')).toLocaleString()}</div>
        <div className="italic text-muted-foreground">
          {timeSinceOrUntil(new Date(row.original.updatedAt))}
        </div>
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
]
