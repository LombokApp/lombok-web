import { type AppDTO } from '@lombokapp/types'
import type { HideableColumnDef } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import { DataTableColumnHeader } from '@lombokapp/ui-toolkit/components/data-table/data-table-column-header'
import { cn } from '@lombokapp/ui-toolkit/utils'

import { ActorFeedback } from '@/src/components/actor-feedback'
import { DateDisplay } from '@/src/components/date-display'
import { TableLinkColumn } from '@/src/components/table-link-column/table-link-column'

export const serverAppsTableColumns: HideableColumnDef<AppDTO>[] = [
  {
    id: 'link',
    cell: ({ row }) => (
      <TableLinkColumn
        to={`/server/apps/${row.original.identifier.toLowerCase()}`}
      />
    ),
    enableSorting: false,
    zeroWidth: true,
  },
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
      <ActorFeedback
        title={row.original.label}
        actorIdentifier={row.original.identifier}
        showSubtitle={true}
        subtitle={row.original.identifier}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'description',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Description"
      />
    ),
    cell: ({ row }) => (
      <div className="max-w-80 truncate">
        <span>{row.original.config.description || ''}</span>
      </div>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: 'requiresStorage',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Required Storage"
      />
    ),
    cell: ({ row }) => (
      <div className="flex w-[80px] items-center justify-center">
        <span>{row.original.requiresStorage ? 'Yes' : 'No'}</span>
      </div>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: 'tasks',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Tasks"
      />
    ),
    cell: ({ row }) => (
      <span
        className={cn(
          !row.original.config.tasks?.length && 'italic opacity-50',
        )}
      >
        {row.original.config.tasks?.length
          ? row.original.config.tasks.map((task) => task.label).join(', ')
          : 'None'}
      </span>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: 'workers',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Serverless Workers"
      />
    ),
    cell: ({ row }) => {
      const allWorkers = Object.keys(row.original.config.workers ?? {}).filter(
        (v, i, a) => a.indexOf(v) === i,
      )
      return (
        <span className={cn(!allWorkers.length && 'italic opacity-50')}>
          {allWorkers.length ? allWorkers.join(', ') : 'None'}
        </span>
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
        title="Created At"
      />
    ),
    cell: ({ row }) => (
      <span className="text-xs">
        {row.original.createdAt ? (
          <DateDisplay date={row.original.createdAt} showTimeSince={true} />
        ) : (
          ''
        )}
      </span>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: 'updatedAt',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Updated At"
      />
    ),
    cell: ({ row }) => (
      <span className="text-xs">
        {row.original.updatedAt ? (
          <DateDisplay date={row.original.updatedAt} />
        ) : (
          ''
        )}
      </span>
    ),
    enableSorting: true,
    enableHiding: true,
  },
]
