import {
  Badge,
  BadgeVariant,
} from '@lombokapp/ui-toolkit/components/badge/badge'
import type { HideableColumnDef } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import { DataTableColumnHeader } from '@lombokapp/ui-toolkit/components/data-table/data-table-column-header'
import { cn } from '@lombokapp/ui-toolkit/utils'

import { TableLinkColumn } from '@/src/components/table-link-column/table-link-column'

import type {
  DockerHostConfigSummary,
  DockerHostConnectionState,
  DockerHostContainerState,
} from './server-docker.types'

export interface DockerHostListRow extends DockerHostConfigSummary {
  connection?: DockerHostConnectionState
  containers: DockerHostContainerState[]
  containersError?: string
}

const renderConnection = (connection?: DockerHostConnectionState) => {
  if (!connection) {
    return (
      <Badge variant={BadgeVariant.outline} className="text-xs">
        Unknown
      </Badge>
    )
  }

  const variant = connection.success
    ? BadgeVariant.secondary
    : BadgeVariant.destructive

  return (
    <div className="flex flex-col gap-1">
      <Badge variant={variant} className="text-xs">
        {connection.success ? 'Connected' : 'Offline'}
      </Badge>
      {connection.success ? (
        <span className="text-xs text-muted-foreground">
          {connection.version ?? 'Unknown'}
          {connection.apiVersion ? ` (API ${connection.apiVersion})` : ''}
        </span>
      ) : connection.error ? (
        <span
          className="line-clamp-1 text-xs text-muted-foreground"
          title={connection.error}
        >
          {connection.error}
        </span>
      ) : null}
    </div>
  )
}

const renderContainerSummary = (
  containers: DockerHostContainerState[],
  containersError?: string,
) => {
  if (containersError) {
    return (
      <span className="text-xs text-destructive" title={containersError}>
        Error
      </span>
    )
  }

  const runningCount = containers.filter(
    (container) => container.state === 'running',
  ).length
  const ratio = containers.length ? runningCount / containers.length : 0

  return (
    <div className="flex min-w-[120px] flex-col gap-1">
      <span
        className={cn(
          'text-xs font-medium',
          !containers.length && 'italic opacity-50',
        )}
      >
        {containers.length
          ? `${runningCount}/${containers.length} running`
          : '0'}
      </span>
      <div className="h-1.5 w-full rounded-full bg-muted/40">
        <div
          className={cn(
            'h-full rounded-full',
            ratio > 0 ? 'bg-primary/70' : 'bg-muted/30',
          )}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  )
}

export const serverDockerHostsTableColumns: HideableColumnDef<DockerHostListRow>[] =
  [
    {
      id: 'link',
      cell: ({ row }) => (
        <TableLinkColumn to={`/server/docker/${row.original.id}`} />
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
          title="Host"
        />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium">{row.original.id}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.host}
          </span>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'type',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Type"
        />
      ),
      cell: ({ row }) => (
        <Badge variant={BadgeVariant.outline} className="text-xs uppercase">
          {row.original.type}
        </Badge>
      ),
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: 'connection',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Connection"
        />
      ),
      cell: ({ row }) => renderConnection(row.original.connection),
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: 'containers',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Containers"
        />
      ),
      cell: ({ row }) =>
        renderContainerSummary(
          row.original.containers,
          row.original.containersError,
        ),
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: 'assignedProfiles',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Assigned Profiles"
        />
      ),
      cell: ({ row }) => (
        <span
          className={cn(
            'text-xs',
            !row.original.assignedProfiles.length && 'italic opacity-50',
          )}
          title={row.original.assignedProfiles.join(', ')}
        >
          {row.original.assignedProfiles.length
            ? `${row.original.assignedProfiles.length} profile${
                row.original.assignedProfiles.length === 1 ? '' : 's'
              }`
            : 'None'}
        </span>
      ),
      enableSorting: false,
      enableHiding: true,
    },
  ]
