import type { TaskDTO } from '@stellariscloud/types'
import type { HideableColumnDef } from '@stellariscloud/ui-toolkit'
import { cn } from '@stellariscloud/ui-toolkit'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { timeSinceOrUntil } from '@stellariscloud/utils'

import { TableLinkColumn } from '../../../../components/table-link-column/table-link-column'
import { invertColour, stringToColour } from '../../../../utils/colors'

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
      <div className="flex items-center gap-2">
        <div
          className="flex size-8 items-center justify-center overflow-hidden rounded-full"
          style={{
            background: row.original.ownerIdentifier.includes(':')
              ? stringToColour(row.original.ownerIdentifier.split(':')[1] ?? '')
              : '',
            color: row.original.ownerIdentifier.includes(':')
              ? invertColour(
                  stringToColour(
                    row.original.ownerIdentifier.split(':')[1] ?? '',
                  ),
                )
              : undefined,
          }}
        >
          {row.original.ownerIdentifier === 'core' ? (
            <img width={30} height={30} alt="Core" src="/stellariscloud.png" />
          ) : (
            <span className="uppercase">
              {row.original.ownerIdentifier.split(':')[1]?.[0] ?? ''}
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <div className="w-[80px]">{row.getValue('taskIdentifier')}</div>
          <span className="max-w-[150px] truncate text-xs text-muted-foreground">
            {row.original.taskDescription}
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
      <div className="flex w-[140px] flex-col text-xs">
        <div>{new Date(row.getValue('updatedAt')).toLocaleString()}</div>
        <div className="italic text-muted-foreground">
          {timeSinceOrUntil(new Date(row.original.updatedAt))}
        </div>
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
]
