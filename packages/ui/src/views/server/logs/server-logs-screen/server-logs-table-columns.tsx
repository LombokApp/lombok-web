import { type LogEntryDTO, PLATFORM_IDENTIFIER } from '@lombokapp/types'
import { DataTableColumnHeader } from '@lombokapp/ui-toolkit/components'
import type { HideableColumnDef } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'

import { ActorFeedback } from '@/src/components/actor-feedback'
import { DateDisplay } from '@/src/components/date-display'
import { getLevelColor } from '@/src/utils/level-utils'

export const serverLogsTableColumns: HideableColumnDef<LogEntryDTO>[] = [
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
      <ActorFeedback
        actorIdentifier={row.original.emitterIdentifier}
        title={row.original.emitterIdentifier.toUpperCase()}
        showSubtitle={true}
        subtitle={
          row.original.emitterIdentifier === PLATFORM_IDENTIFIER
            ? 'internal:platform'
            : `app:${row.original.emitterIdentifier}`
        }
      />
    ),
    enableHiding: false,
  },
  {
    accessorKey: 'message',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Message"
      />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <span className="font-medium">{row.original.message}</span>
        </div>
      </div>
    ),
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
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'size-2 rounded-full',
              getLevelColor(row.original.level),
            )}
          />
          <div className="">{row.getValue('level')}</div>
        </div>
      )
    },
    enableHiding: false,
  },
  {
    accessorKey: 'targetLocation',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Folder / Object"
      />
    ),
    cell: ({ row }) => {
      const targetLocationContext = row.original.targetLocationContext
      if (!targetLocationContext) {
        return (
          <div className="flex items-center gap-2 font-normal">
            <span className="italic text-muted-foreground">None</span>
          </div>
        )
      }

      return (
        <div className="flex flex-col gap-1">
          <div className="font-medium">
            Folder:{' '}
            {targetLocationContext.folderName ||
              `${targetLocationContext.folderId.slice(0, 8)}...`}
          </div>
          {targetLocationContext.objectKey && (
            <div className="text-sm text-muted-foreground">
              Object: {targetLocationContext.objectKey}
            </div>
          )}
        </div>
      )
    },
    enableHiding: false,
    enableSorting: false,
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
    cell: ({ row }) => {
      return (
        <div className="text-xs">
          <DateDisplay date={row.original.createdAt} />
        </div>
      )
    },
    enableHiding: false,
  },
]
