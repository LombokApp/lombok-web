import { type EventDTO, PLATFORM_IDENTIFIER } from '@stellariscloud/types'
import type { HideableColumnDef } from '@stellariscloud/ui-toolkit'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'

import { ActorFeedback } from '@/src/components/actor-feedback'
import { DateDisplay } from '@/src/components/date-display'
import { TableLinkColumn } from '@/src/components/table-link-column/table-link-column'

interface EventsTableColumnsConfig {
  getLinkTo: (event: EventDTO) => string
  eventIdentifierTitle?: string
  showActorSubtext?: boolean
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
      accessorKey: 'eventIdentifier',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title={config.eventIdentifierTitle || 'Event Identifier'}
        />
      ),
      cell: ({ row }) => (
        <ActorFeedback
          actorIdentifier={row.original.emitterIdentifier}
          title={row.getValue('eventIdentifier')}
          showSubtitle={config.showActorSubtext}
          subtitle={`emitted by ${row.original.emitterIdentifier === PLATFORM_IDENTIFIER ? 'internal:platform' : `app:${row.original.emitterIdentifier}`}`}
        />
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
      accessorKey: 'subjectContext',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title={config.folderObjectColumnTitle || 'Folder / Object'}
        />
      ),
      cell: ({ row: { original: event } }) => {
        const hasFolder =
          event.subjectContext?.folderName || event.subjectContext?.folderId
        const hasObject = event.subjectContext?.objectKey

        if (!hasFolder && !hasObject) {
          return (
            <div className="flex items-center gap-2 font-normal">
              <span className="italic text-muted-foreground">None</span>
            </div>
          )
        }

        return (
          <div className="flex max-w-80 flex-col gap-1">
            {config.showFolderInFolderObjectColumn && hasFolder && (
              <div className="font-medium">
                {event.subjectContext?.folderName ||
                  event.subjectContext?.folderId}
              </div>
            )}
            {hasObject && (
              <div className="truncate text-sm text-muted-foreground">
                {event.subjectContext?.objectKey}
              </div>
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
  ]
}
