import type { TaskDTO } from '@stellariscloud/types'
import type { HideableColumnDef } from '@stellariscloud/ui-toolkit'
import { cn } from '@stellariscloud/ui-toolkit'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'

import { ActorFeedback } from '@/src/components/actor-feedback'
import { DateDisplay } from '@/src/components/date-display'

import { TableLinkColumn } from '../../../../components/table-link-column/table-link-column'

export const serverTasksTableColumns: HideableColumnDef<TaskDTO>[] = [
  {
    id: 'link',
    cell: ({ row }) => (
      <TableLinkColumn to={`/server/tasks/${row.original.id}`} />
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
        title="Task"
      />
    ),
    cell: ({ row }) => (
      <ActorFeedback
        emitterIdentifier={row.original.ownerIdentifier}
        title={row.original.taskIdentifier}
        showSubtitle={true}
      />
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
    cell: ({ row: { original: task } }) => {
      return (
        <div className="flex items-center gap-2 font-normal">
          {task.subjectObjectKey ? (
            task.subjectObjectKey
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

          <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
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
    cell: ({ row }) => <DateDisplay date={row.original.createdAt} />,
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
    cell: ({ row }) => <DateDisplay date={row.original.updatedAt} />,
    enableSorting: true,
    enableHiding: false,
  },
]
