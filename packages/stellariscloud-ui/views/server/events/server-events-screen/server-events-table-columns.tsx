'use client'

import { ColumnDef } from '@tanstack/react-table'

import { DataTableColumnHeader } from '@stellariscloud/ui-toolkit/src/components/data-table/data-table-column-header'
import { timeSinceOrUntil } from '@stellariscloud/utils'
import { invertColour, stringToColour } from '../../../../utils/colors'
import { EventDTO } from '@stellariscloud/api-client'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { DataTableRowActions, cn } from '@stellariscloud/ui-toolkit'

export const serverEventsTableColumns: ColumnDef<EventDTO>[] = [
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
          className="flex items-center justify-center rounded-full w-8 h-8 overflow-hidden"
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
            'rounded-full w-2 h-2',
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
    id: 'actions',
    cell: ({ row }) => {
      const router = useRouter()
      return (
        <DataTableRowActions
          actions={[
            {
              label: 'View',
              value: 'view',
              isPinned: true,
              onClick: () => router.push(`/server/events/${row.original.id}`),
            },
          ]}
          row={row}
        />
      )
    },
  },
]
