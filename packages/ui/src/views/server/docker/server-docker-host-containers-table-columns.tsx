import { Badge, BadgeVariant } from '@lombokapp/ui-toolkit/components/badge/badge'
import type { HideableColumnDef } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import { DataTableColumnHeader } from '@lombokapp/ui-toolkit/components/data-table/data-table-column-header'
import { cn } from '@lombokapp/ui-toolkit/utils'

import { DateDisplay } from '@/src/components/date-display'
import { TableLinkColumn } from '@/src/components/table-link-column/table-link-column'

import type { DockerHostContainerState } from './server-docker.types'

const renderStateBadge = (state: DockerHostContainerState['state']) => {
  const variant =
    state === 'running'
      ? BadgeVariant.secondary
      : state === 'exited'
        ? BadgeVariant.destructive
        : BadgeVariant.outline

  return (
    <Badge variant={variant} className="capitalize">
      {state}
    </Badge>
  )
}

export const createServerDockerHostContainersTableColumns = (
  hostId: string,
): HideableColumnDef<DockerHostContainerState>[] => [
  {
    id: 'link',
    cell: ({ row }) => (
      <TableLinkColumn
        to={`/server/docker/${hostId}/containers/${row.original.id}`}
      />
    ),
    enableSorting: false,
    zeroWidth: true,
  },
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Container ID"
      />
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs" title={row.original.id}>
        {row.original.id.slice(0, 12)}
      </span>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'image',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Image"
      />
    ),
    cell: ({ row }) => (
      <span
        className={cn('max-w-72 truncate text-sm text-muted-foreground')}
        title={row.original.image}
      >
        {row.original.image}
      </span>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: 'profileId',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Profile"
      />
    ),
    cell: ({ row }) =>
      row.original.profileId ? (
        <Badge variant={BadgeVariant.outline} className="text-xs">
          {row.original.profileId}
        </Badge>
      ) : (
        <span className="italic opacity-50">Unknown</span>
      ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: 'state',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="State"
      />
    ),
    cell: ({ row }) => renderStateBadge(row.original.state),
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Created"
      />
    ),
    cell: ({ row }) =>
      row.original.createdAt ? (
        <span className="text-xs">
          <DateDisplay date={row.original.createdAt} showTimeSince={true} />
        </span>
      ) : (
        <span className="italic opacity-50">Unknown</span>
      ),
    enableSorting: false,
    enableHiding: true,
  },
]
