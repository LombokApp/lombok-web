import type { AppDTO } from '@stellariscloud/types'
import type { HideableColumnDef } from '@stellariscloud/ui-toolkit'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'

import { DateDisplay } from '@/src/components/date-display'

import { TableLinkColumn } from '../../../../components/table-link-column/table-link-column'
import { invertColour, stringToColour } from '../../../../utils/colors'

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
      <div className="flex items-center gap-4 font-normal">
        <div
          className="flex size-8 items-center justify-center overflow-hidden rounded-full"
          style={{
            background: stringToColour(row.original.identifier),
            color: invertColour(stringToColour(row.original.identifier)),
          }}
        >
          <span className="uppercase">{row.original.identifier[0]}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm">{row.original.label.toUpperCase()}</span>
          <span className="text-xs italic text-muted-foreground">
            {row.original.identifier.toLowerCase()}
          </span>
        </div>
      </div>
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
    cell: ({ row }) => <span>{row.original.config.description || ''}</span>,
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
      const scriptWorkers = row.original.workerScripts.map((w) => w.identifier)
      const configWorkers = row.original.config.workerScripts
        ? Object.keys(row.original.config.workerScripts)
        : []
      const allWorkers = [...scriptWorkers, ...configWorkers].filter(
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
      <span>
        {row.original.createdAt ? (
          <DateDisplay
            className="text-sm"
            date={row.original.createdAt}
            showTimeSince={true}
            dateOptions={{
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }}
          />
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
      <span>
        {row.original.updatedAt ? (
          <DateDisplay
            className="text-sm"
            date={row.original.updatedAt}
            dateOptions={{
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }}
          />
        ) : (
          ''
        )}
      </span>
    ),
    enableSorting: true,
    enableHiding: true,
  },
]
