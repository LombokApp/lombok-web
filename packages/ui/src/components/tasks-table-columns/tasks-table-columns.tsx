import { PLATFORM_IDENTIFIER, type TaskDTO } from '@lombokapp/types'
import type { HideableColumnDef } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import { DataTableColumnHeader } from '@lombokapp/ui-toolkit/components/data-table/data-table-column-header'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'

import { ActorFeedback } from '@/src/components/actor-feedback'
import { DateDisplay } from '@/src/components/date-display'
import { TableLinkColumn } from '@/src/components/table-link-column/table-link-column'

interface TasksTableColumnsConfig {
  getLinkTo: (task: TaskDTO) => string
  taskIdentifierTitle?: string
  showOwnerSubtext?: boolean
  folderObjectColumnTitle?: string
  showFolderInFolderObjectColumn?: boolean
}

export function configureTasksTableColumns(
  config: TasksTableColumnsConfig,
): HideableColumnDef<TaskDTO>[] {
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
      accessorKey: 'taskIdentifier',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title={config.taskIdentifierTitle || 'Task'}
        />
      ),
      cell: ({ row }) => (
        <div className="min-w-min shrink-0">
          <ActorFeedback
            actorIdentifier={row.original.ownerIdentifier}
            title={row.original.taskIdentifier}
            showSubtitle={config.showOwnerSubtext}
            subtitle={`owned by ${
              row.original.ownerIdentifier === PLATFORM_IDENTIFIER
                ? 'internal:platform'
                : `app:${row.original.ownerIdentifier}`
            }`}
          />
        </div>
      ),
      enableSorting: false,
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
      cell: ({ row: { original: task } }) => {
        const hasFolder =
          task.subjectContext?.folderName || task.subjectContext?.folderId
        const hasObject = task.subjectContext?.objectKey

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
              <div className="truncate font-medium">
                {task.subjectContext?.folderName ||
                  task.subjectContext?.folderId}
              </div>
            )}
            {hasObject && (
              <div className="max-w-80 truncate text-sm text-muted-foreground">
                {task.subjectContext?.objectKey}
              </div>
            )}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Status"
        />
      ),
      enableGlobalFilter: false,
      cell: ({ row: { original: task } }) => {
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'size-2 rounded-full',
                  task.completedAt
                    ? 'bg-green-600'
                    : task.errorAt
                      ? 'bg-red-600'
                      : !task.startedAt
                        ? 'bg-gray-600'
                        : 'bg-yellow-600',
                )}
              />
            </div>

            <div className="flex items-center gap-2 truncate text-xs font-normal text-muted-foreground">
              {task.completedAt
                ? 'Complete'
                : task.errorAt
                  ? 'Failed'
                  : !task.startedAt
                    ? 'Pending'
                    : 'Running'}
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
        <div className="text-xs">
          <DateDisplay date={row.original.createdAt} />
        </div>
      ),
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => (
        <DataTableColumnHeader
          canHide={column.getCanHide()}
          column={column}
          title="Updated"
        />
      ),
      cell: ({ row }) => (
        <div className="text-xs">
          <DateDisplay date={row.original.updatedAt} />
        </div>
      ),
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: 'completedAt',
      enableSorting: true,
      forceHiding: true,
    },
    {
      accessorKey: 'errorAt',
      enableSorting: true,
      forceHiding: true,
    },
    {
      accessorKey: 'startedAt',
      enableSorting: true,
      forceHiding: true,
    },
  ]
}
