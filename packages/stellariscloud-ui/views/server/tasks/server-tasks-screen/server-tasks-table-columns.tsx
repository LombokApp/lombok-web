'use client'

import { ColumnDef } from '@tanstack/react-table'

import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { TaskDTO } from '@stellariscloud/api-client'
import { timeSinceOrUntil } from '@stellariscloud/utils'
import Image from 'next/image'
import { DataTableRowActions, cn } from '@stellariscloud/ui-toolkit'
import { useRouter } from 'next/router'
import { invertColour, stringToColour } from '../../../../utils/colors'
import Link from 'next/link'

export const serverTasksTableColumns: ColumnDef<TaskDTO>[] = [
  {
    id: '__HIDDEN__',
    cell: ({ row }) => {
      return (
        <div className="w-0 h-0 overflow-hidden max-w-0">
          <Link
            href={`/server/tasks/${row.original.id}`}
            className="absolute top-0 bottom-0 left-0 right-0"
          />
        </div>
      )
    },
  },
  {
    accessorKey: 'taskKey',
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
          className="flex items-center justify-center rounded-full w-8 h-8 overflow-hidden"
          style={{
            background: row.original.ownerIdentifier.includes(':')
              ? stringToColour(row.original.ownerIdentifier.split(':')[1])
              : '',
            color: row.original.ownerIdentifier.includes(':')
              ? invertColour(
                  stringToColour(row.original.ownerIdentifier.split(':')[1]),
                )
              : undefined,
          }}
        >
          {row.original.ownerIdentifier === 'CORE' ? (
            <Image
              width={30}
              height={30}
              alt="Core"
              src="/stellariscloud.png"
            />
          ) : (
            <span className="uppercase">
              {row.original.ownerIdentifier.split(':')[1][0]}
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <div className="w-[80px]">{row.getValue('taskKey')}</div>
          <span className="max-w-[150px] truncate text-muted-foreground text-xs">
            {row.original.taskDescription.textKey}
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
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Status"
      />
    ),
    enableGlobalFilter: false,
    cell: ({ row: { original: task } }) => {
      return (
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'rounded-full w-2 h-2',
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

          <div className="flex gap-2 items-center font-normal text-muted-foreground text-xs">
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
      <div className="flex flex-col text-xs w-[140px]">
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
      <div className="flex flex-col text-xs w-[140px]">
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
