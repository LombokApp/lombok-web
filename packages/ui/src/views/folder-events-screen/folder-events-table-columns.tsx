import type { EventDTO } from '@stellariscloud/types'
import type { HideableColumnDef } from '@stellariscloud/ui-toolkit'
import { cn } from '@stellariscloud/ui-toolkit'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { timeSinceOrUntil } from '@stellariscloud/utils'

import { TableLinkColumn } from '../../components/table-link-column/table-link-column'
import { invertColour, stringToColour } from '../../utils/colors'

export const folderEventsTableColumns: HideableColumnDef<EventDTO>[] = [
  {
    id: 'link',
    cell: ({ row }) => (
      <TableLinkColumn
        to={`/folders/${row.original.locationContext?.folderId}/events/${row.original.id}`}
      />
    ),
    enableSorting: false,
    zeroWidth: true,
  },
  {
    accessorKey: 'eventKey',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Event"
      />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div
          className="flex size-8 items-center justify-center overflow-hidden rounded-full"
          style={{
            background: row.original.emitterIdentifier.includes(':')
              ? stringToColour(
                  row.original.emitterIdentifier.split(':')[1] ?? '',
                )
              : '',
            color: row.original.emitterIdentifier.includes(':')
              ? invertColour(stringToColour(row.original.emitterIdentifier))
              : undefined,
          }}
        >
          {row.original.emitterIdentifier === 'core' ? (
            <img width={30} height={30} alt="Core" src="/stellariscloud.png" />
          ) : (
            <span className="uppercase">
              {row.original.emitterIdentifier.split(':')[1]?.[0] ?? ''}
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <div className="w-[200px] font-medium">
            {row.getValue('eventKey')}
          </div>
          <span className="max-w-[200px] truncate text-xs text-muted-foreground">
            {row.original.emitterIdentifier}
          </span>
        </div>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'objectKey',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Object"
      />
    ),
    cell: ({ row: { original: event } }) => {
      return (
        <div className="flex items-center gap-2 font-normal">
          {event.locationContext?.objectKey ? (
            event.locationContext.objectKey
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
    accessorKey: 'level',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Level"
      />
    ),
    enableGlobalFilter: false,
    cell: ({ row: { original: event } }) => {
      // Map event levels to color indicators
      const getLevelColor = (level: string) => {
        switch (level) {
          case 'ERROR':
            return 'bg-red-500'
          case 'WARN':
            return 'bg-yellow-500'
          case 'INFO':
            return 'bg-blue-500'
          case 'DEBUG':
            return 'bg-gray-500'
          case 'TRACE':
            return 'bg-gray-400'
          default:
            return 'bg-gray-500'
        }
      }

      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn('size-2 rounded-full', getLevelColor(event.level))}
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
            {event.level}
          </div>
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
]
