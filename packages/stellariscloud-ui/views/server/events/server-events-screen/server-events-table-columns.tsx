'use client'

import type { EventDTO } from '@stellariscloud/api-client'
import { cn } from '@stellariscloud/ui-toolkit'
import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { timeSinceOrUntil } from '@stellariscloud/utils'
import type { ColumnDef } from '@tanstack/react-table'
import Image from 'next/image'
import Link from 'next/link'

import { invertColour, stringToColour } from '../../../../utils/colors'

export const serverEventsTableColumns: ColumnDef<EventDTO>[] = [
  {
    id: '__HIDDEN__',
    cell: ({ row }) => {
      return (
        <div className="size-0 max-w-0 overflow-hidden">
          <Link
            href={`/server/events/${row.original.id}`}
            className="absolute inset-0"
          />
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'eventKey',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Event Key"
      />
    ),
    cell: ({ row }) => (
      <div className="flex items-start gap-2">
        <div
          className="flex size-8 items-center justify-center overflow-hidden rounded-full"
          style={{
            background: stringToColour(row.original.emitterIdentifier),
            color: invertColour(stringToColour(row.original.emitterIdentifier)),
          }}
        >
          {row.original.emitterIdentifier === 'CORE' ? (
            <Image
              width={30}
              height={30}
              alt="Core"
              src="/stellariscloud.png"
            />
          ) : (
            <span className="uppercase">
              {row.original.emitterIdentifier.split(':')[1][0]}
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <div className="">{row.getValue('eventKey')}</div>
        </div>
      </div>
    ),
    enableSorting: false,
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
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'size-2 rounded-full',
            row.original.level === 'INFO'
              ? 'bg-blue-500'
              : row.original.level === 'ERROR'
                ? 'bg-red-500'
                : row.original.level === 'WARN'
                  ? 'bg-amber-500'
                  : row.original.level === 'DEBUG'
                    ? 'bg-neutral-500'
                    : 'bg-slate-500',
          )}
        />
        <div className="">{row.getValue('level')}</div>
      </div>
    ),
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
        <div className="text-muted-foreground italic">
          {timeSinceOrUntil(new Date(row.original.createdAt))}
        </div>
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
]
