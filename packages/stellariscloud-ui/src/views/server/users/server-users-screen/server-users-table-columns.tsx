'use client'

import type { UserDTO } from '@stellariscloud/api-client'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { timeSinceOrUntil } from '@stellariscloud/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'

import { invertColour, stringToColour } from '../../../../utils/colors'

export const serverUsersTableColumns: ColumnDef<UserDTO>[] = [
  {
    id: '__HIDDEN__',
    cell: ({ row }) => {
      return (
        <div className="size-0 max-w-0 overflow-hidden">
          <Link
            to={`/server/users/${row.original.id}`}
            className="absolute inset-0"
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
      <div className="flex items-start gap-4">
        <div
          className="flex size-8 items-center justify-center overflow-hidden rounded-full"
          style={{
            background: stringToColour(user.id),
            color: invertColour(stringToColour(user.id)),
          }}
        >
          <span className="uppercase">
            {user.name.length > 0
              ? user.name[0]
              : user.username.length > 0
                ? user.username[0]
                : '?'}
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
        <div className="flex items-center gap-2 font-normal">
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
      <div className="flex w-[140px] flex-col text-xs">
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
      <div className="flex w-[140px] flex-col text-xs">
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
