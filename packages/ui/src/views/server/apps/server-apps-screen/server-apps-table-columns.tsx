import { type AppDTO } from '@lombokapp/types'
import type { HideableColumnDef } from '@lombokapp/ui-toolkit'
import { DataTableColumnHeader } from '@lombokapp/ui-toolkit/src/components/data-table/data-table-column-header'

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
      <span>
        {row.original.config.tasks.map((task) => task.label).join(', ') || ''}
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
        title="Workers"
      />
    ),
    cell: ({ row }) => {
      const workers = Object.keys(row.original.workers).map(
        (identifier) => identifier,
      )
      const configWorkers = row.original.config.workers
        ? Object.keys(row.original.config.workers)
        : []
      const allWorkers = [...workers, ...configWorkers].filter(
        (v, i, a) => a.indexOf(v) === i,
      )
      return <span>{allWorkers.join(', ')}</span>
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
