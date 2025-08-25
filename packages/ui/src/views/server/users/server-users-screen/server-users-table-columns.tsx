import type { UserDTO } from '@lombokapp/types'
import type { HideableColumnDef } from '@lombokapp/ui-toolkit'
import { DataTableColumnHeader } from '@lombokapp/ui-toolkit'

import { DateDisplay } from '@/src/components/date-display'
import { TableLinkColumn } from '@/src/components/table-link-column/table-link-column'
import { invertColour, stringToColour } from '@/src/utils/colors'

export const serverUsersTableColumns: HideableColumnDef<UserDTO>[] = [
  {
    id: 'link',
    cell: ({ row }) => (
      <TableLinkColumn to={`/server/users/${row.original.id}`} />
    ),
    enableSorting: false,
    zeroWidth: true,
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
            {(user.name?.length ?? 0) > 0
              ? user.name?.[0]
              : user.username.length > 0
                ? user.username[0]
                : '?'}
          </span>
        </div>
        <div className="flex flex-col">
          <div>
            {user.email ?? (
              <span className="italic text-muted-foreground">No Email</span>
            )}
          </div>
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
      <div className="text-xs">
        <DateDisplay date={row.original.createdAt} />
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
      <div className="text-xs">
        <DateDisplay date={row.original.updatedAt} />
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
]
