import type { LogEntryDTO } from '@stellariscloud/types'
import type { HideableColumnDef } from '@stellariscloud/ui-toolkit'
import { cn } from '@stellariscloud/ui-toolkit'
import { Badge } from '@stellariscloud/ui-toolkit/src/components/badge'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import {
  dateStringToHumanReadable,
  timeSinceOrUntil,
} from '@stellariscloud/utils'
import { BugIcon, InfoIcon, OctagonAlert, TriangleAlert } from 'lucide-react'

import { stringToColour } from '../../../../utils/colors'

export const serverLogsTableColumns: HideableColumnDef<LogEntryDTO>[] = [
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
        <div
          className="size-2 rounded-full"
          style={{
            backgroundColor: stringToColour(row.original.emitterIdentifier),
          }}
        />
        <span className="text-sm text-muted-foreground">
          {row.original.emitterIdentifier}
        </span>
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
      const level = row.original.level
      const getLevelConfig = (_levelValue: string) => {
        switch (level) {
          case 'TRACE':
            return { icon: InfoIcon, color: 'bg-gray-100 text-gray-800' }
          case 'DEBUG':
            return { icon: BugIcon, color: 'bg-blue-100 text-blue-800' }
          case 'INFO':
            return { icon: InfoIcon, color: 'bg-green-100 text-green-800' }
          case 'WARN':
            return {
              icon: TriangleAlert,
              color: 'bg-yellow-100 text-yellow-800',
            }
          case 'ERROR':
            return { icon: OctagonAlert, color: 'bg-red-100 text-red-800' }
          default:
            return { icon: InfoIcon, color: 'bg-gray-100 text-gray-800' }
        }
      }
      const config = getLevelConfig(level)
      const Icon = config.icon
      return (
        <div className="flex items-center gap-2">
          <Badge className={cn('gap-1', config.color)}>
            <Icon className="size-3" />
            {level}
          </Badge>
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
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          <div className="flex flex-col">
            <span>
              {dateStringToHumanReadable(new Date(row.original.createdAt))}
            </span>
            <span>{timeSinceOrUntil(new Date(row.original.createdAt))}</span>
          </div>
        </span>
      </div>
    ),
  },
]
