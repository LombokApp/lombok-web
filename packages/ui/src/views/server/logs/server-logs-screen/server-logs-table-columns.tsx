import type { LogEntryDTO } from '@stellariscloud/types'
import type { HideableColumnDef } from '@stellariscloud/ui-toolkit'
import { cn } from '@stellariscloud/ui-toolkit'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'

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
        emitterIdentifier={row.original.emitterIdentifier}
        title={(
          row.original.emitterIdentifier.split(':')[1] ?? ''
        ).toUpperCase()}
        showSubtitle={true}
      />
    ),
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
  },
  {
    accessorKey: 'locationContext',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Location"
      />
    ),
    cell: ({ row }) => {
      const locationContext = row.original.locationContext
      if (!locationContext) {
        return <span className="text-muted-foreground">Server</span>
      }
      return (
        <div className="flex flex-col">
          <span className="text-sm">
            Folder: {locationContext.folderId.slice(0, 8)}...
          </span>
          {locationContext.objectKey && (
            <span className="text-xs text-muted-foreground">
              Object: {locationContext.objectKey}
            </span>
          )}
        </div>
      )
    },
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
      return <DateDisplay date={row.original.createdAt} />
    },
  },
]
