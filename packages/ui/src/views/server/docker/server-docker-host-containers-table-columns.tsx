import {
  Badge,
  BadgeVariant,
} from '@lombokapp/ui-toolkit/components/badge/badge'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import type { HideableColumnDef } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import { DataTableColumnHeader } from '@lombokapp/ui-toolkit/components/data-table/data-table-column-header'
import { cn } from '@lombokapp/ui-toolkit/utils'
import { AlertTriangle, Settings2 } from 'lucide-react'

import { DateDisplay } from '@/src/components/date-display'
import { TableLinkColumn } from '@/src/components/table-link-column/table-link-column'

export interface HostContainerRow {
  id: string
  image: string
  state: string
  createdAt?: string
  containerType?: string
  containerLabel?: string
  profileId?: string
  /** Set when showing containers across multiple hosts */
  hostId?: string
  hostLabel?: string
}

interface ContainerColumnsOptions {
  /** Fixed host ID (single-host context). If omitted, hostId is read from each row. */
  hostId?: string
  /** Show the host label column (multi-host context). Default false. */
  showHost?: boolean
  /** Callback when user clicks edit on a standalone container row. */
  onEditStandalone?: (containerId: string) => void
}

export const createContainerTableColumns = (
  options: ContainerColumnsOptions = {},
): HideableColumnDef<HostContainerRow>[] => [
  {
    id: 'link',
    cell: ({ row }) => {
      const hid = options.hostId ?? row.original.hostId
      if (!hid) {
        return null
      }
      return (
        <TableLinkColumn
          to={`/server/docker/${hid}/containers/${row.original.id}`}
        />
      )
    },
    enableSorting: false,
    zeroWidth: true,
  },
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Container"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="font-medium">
          {row.original.containerLabel ?? row.original.id.slice(0, 12)}
        </span>
        <span className="text-xs text-muted-foreground">
          {row.original.containerLabel
            ? row.original.id.slice(0, 12)
            : undefined}
          {options.showHost && row.original.hostLabel
            ? (row.original.containerLabel ? ' · ' : '') +
              row.original.hostLabel
            : undefined}
        </span>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'containerType',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Type"
      />
    ),
    cell: ({ row }) => (
      <Badge
        variant={
          row.original.containerType === 'worker'
            ? BadgeVariant.secondary
            : BadgeVariant.outline
        }
        className="text-xs"
      >
        {row.original.containerType === 'worker' ? 'Worker' : 'Standalone'}
      </Badge>
    ),
    enableSorting: false,
    enableHiding: true,
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
        <span className="italic opacity-50">—</span>
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
    cell: ({ row }) => {
      const s = row.original.state

      if (s === 'not_found') {
        return (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-amber-500" />
            <span className="text-xs text-amber-500">Not found on host</span>
          </div>
        )
      }

      const variant =
        s === 'running'
          ? BadgeVariant.secondary
          : s === 'exited'
            ? BadgeVariant.destructive
            : BadgeVariant.outline

      return (
        <Badge variant={variant} className="text-xs capitalize">
          {s}
        </Badge>
      )
    },
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
        <span className="italic opacity-50">—</span>
      ),
    enableSorting: false,
    enableHiding: true,
  },
  ...(options.onEditStandalone
    ? [
        {
          id: 'actions',
          cell: ({ row }: { row: { original: HostContainerRow } }) =>
            row.original.containerType === 'standalone' ? (
              <div className="relative z-20 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => options.onEditStandalone?.(row.original.id)}
                >
                  <Settings2 className="mr-1.5 size-3" />
                  Configure
                </Button>
              </div>
            ) : null,
          enableSorting: false,
          enableHiding: false,
        } satisfies HideableColumnDef<HostContainerRow>,
      ]
    : []),
]
