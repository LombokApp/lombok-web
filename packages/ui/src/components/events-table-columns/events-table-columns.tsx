import type { EventDTO } from '@stellariscloud/types'
import type { HideableColumnDef } from '@stellariscloud/ui-toolkit'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'

import { DateDisplay } from '@/src/components/date-display'
import { TableLinkColumn } from '@/src/components/table-link-column/table-link-column'
import { invertColour, stringToColour } from '@/src/utils/colors'

interface EventsTableColumnsConfig {
  getLinkTo: (event: EventDTO) => string
  eventKeyTitle?: string
  showEmitterSubtext?: boolean
  folderObjectColumnTitle?: string
  showFolderInFolderObjectColumn?: boolean
}

export function configureEventsTableColumns(
  config: EventsTableColumnsConfig,
): HideableColumnDef<EventDTO>[] {
  return [
    {
      id: 'link',
      cell: ({ row }) => (
        <TableLinkColumn to={config.getLinkTo(row.original)} />
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
          title={config.eventKeyTitle || 'Event Key'}
        />
      ),
      cell: ({ row }) => (
        <div className="flex items-start gap-2">
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
              <img
                width={30}
                height={30}
                alt="Core"
                src="/stellariscloud.png"
              />
            ) : (
              <span className="uppercase">
                {row.original.emitterIdentifier.split(':')[1]?.[0] ?? ''}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <div
              className={
                config.showEmitterSubtext ? '' : 'w-[200px] font-medium'
              }
            >
              {row.getValue('eventKey')}
            </div>
            {config.showEmitterSubtext && (
              <span className="max-w-[200px] truncate text-xs text-muted-foreground">
                {row.original.emitterIdentifier}
              </span>
            )}
          </div>
        </div>
      ),
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: 'emitterIdentifier',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Emitter"
        />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {row.original.emitterIdentifier}
          </span>
        </div>
      ),
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: 'locationContext',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title={config.folderObjectColumnTitle || 'Folder / Object'}
        />
      ),
      cell: ({ row: { original: event } }) => {
        const hasFolder =
          event.locationContext?.folderName || event.locationContext?.folderId
        const hasObject = event.locationContext?.objectKey

        if (!hasFolder && !hasObject) {
          return (
            <div className="flex items-center gap-2 font-normal">
              <span className="italic text-muted-foreground">None</span>
            </div>
          )
        }

        return (
          <div className="flex flex-col gap-1">
            {config.showFolderInFolderObjectColumn && hasFolder && (
              <div className="font-medium">
                {event.locationContext?.folderName ||
                  event.locationContext?.folderId}
              </div>
            )}
            {hasObject && (
              <div className="text-sm text-muted-foreground">
                {event.locationContext?.objectKey}
              </div>
            )}
          </div>
        )
      },
      enableSorting: true,
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
      cell: ({ row }) => <DateDisplay date={row.original.createdAt} />,
      enableSorting: true,
      enableHiding: false,
    },
  ]
}
