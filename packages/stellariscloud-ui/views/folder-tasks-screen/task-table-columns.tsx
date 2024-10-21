'use client'

import { ColumnDef } from '@tanstack/react-table'

import { labels, statuses } from './folder-tasks-data'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { TaskDTO } from '@stellariscloud/api-client'
import { timeSinceOrUntil } from '@stellariscloud/utils'
import Image from 'next/image'
import { cn } from '@stellariscloud/ui-toolkit'
import { stringToColour } from '../../utils/colors'

export const tasksTableColumns: ColumnDef<TaskDTO>[] = [
  {
    id: 'owner',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Owner" />
    ),
    cell: ({ row: { original: task } }) => (
      <div
        className="flex items-center justify-center rounded-full w-8 h-8 overflow-hidden"
        style={{
          background: task.ownerIdentifier.includes(':')
            ? stringToColour(task.ownerIdentifier.split(':')[1])
            : '',
        }}
      >
        {task.ownerIdentifier === 'CORE' ? (
          <Image width={30} height={30} alt="Core" src="/stellariscloud.png" />
        ) : (
          <span className="uppercase">
            {task.ownerIdentifier.split(':')[1][0]}
          </span>
        )}
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'taskKey',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Task" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="w-[80px]">{row.getValue('taskKey')}</div>
        <span className="max-w-[150px] truncate text-muted-foreground text-xs">
          {row.original.taskDescription.textKey}
        </span>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'objectKey',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Object" />
    ),
    cell: ({ row: { original: task } }) => {
      return (
        <div className="flex gap-2 items-center font-normal">
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
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row: { original: task } }) => {
      return (
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'rounded-full w-2 h-2',
                task.completedAt
                  ? 'bg-green-500'
                  : task.errorAt
                    ? 'bg-red-500'
                    : !task.startedAt
                      ? 'bg-gray-500'
                      : 'bg-yellow-500',
              )}
            />
          </div>

          <div className="flex gap-2 items-center font-normal text-muted-foreground text-xs">
            {task.completedAt
              ? 'Done'
              : task.errorAt
                ? 'Failed'
                : !task.startedAt
                  ? 'Not Started'
                  : 'Pending'}
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
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col text-xs w-[120px]">
        <div>{new Date(row.getValue('createdAt')).toLocaleString()}</div>
        <div className="italic text-muted-foreground">
          {timeSinceOrUntil(new Date(row.original.createdAt))}
        </div>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col text-xs w-[120px]">
        <div>{new Date(row.getValue('updatedAt')).toLocaleString()}</div>
        <div className="italic text-muted-foreground">
          {timeSinceOrUntil(new Date(row.original.updatedAt))}
        </div>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
