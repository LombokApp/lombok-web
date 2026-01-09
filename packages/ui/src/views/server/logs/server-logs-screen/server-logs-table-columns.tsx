import { CORE_IDENTIFIER, type LogEntryDTO } from '@lombokapp/types'
import {
  DataTableColumnHeader,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@lombokapp/ui-toolkit/components'
import type { HideableColumnDef } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import React from 'react'
import { Link } from 'react-router'

import { ActorFeedback } from '@/src/components/actor-feedback'
import { DateDisplay } from '@/src/components/date-display'
import { getLevelColor } from '@/src/utils/level-utils'

interface LogDetailModalProps {
  modalData: {
    isOpen: boolean
    logEntry?: LogEntryDTO
  }
  setModalData: (modalData: { isOpen: boolean; logEntry?: LogEntryDTO }) => void
}

const LogDetailModal = ({ modalData, setModalData }: LogDetailModalProps) => {
  const logEntry = modalData.logEntry

  return (
    <Dialog
      open={modalData.isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setModalData({ isOpen: false, logEntry: undefined })
        }
      }}
    >
      <DialogContent
        className="top-0 mt-[50%] max-h-[90vh] max-w-3xl overflow-y-auto sm:top-1/2 sm:mt-0"
        aria-description="Log entry details"
      >
        <DialogHeader>
          <DialogTitle>Log Entry Details</DialogTitle>
          <DialogDescription>
            Complete information for this log entry
          </DialogDescription>
        </DialogHeader>
        {logEntry && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  ID
                </label>
                <p className="mt-1 break-all font-mono text-sm">
                  {logEntry.id}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Level
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <div
                    className={cn(
                      'size-2 rounded-full',
                      getLevelColor(logEntry.level),
                    )}
                  />
                  <p className="text-sm">{logEntry.level}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Emitter
                </label>
                <p className="mt-1 break-all font-mono text-sm">
                  {logEntry.emitterIdentifier}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Created At
                </label>
                <div className="mt-1 text-sm">
                  <DateDisplay date={logEntry.createdAt} />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Message
              </label>
              <p className="mt-1 break-words text-sm">{logEntry.message}</p>
            </div>
            {logEntry.targetLocationContext && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Target Location
                </label>
                <div className="mt-1 flex flex-col gap-1">
                  <div className="text-sm">
                    <span className="font-medium">Folder:</span>{' '}
                    {logEntry.targetLocationContext.folderName ||
                      `${logEntry.targetLocationContext.folderId.slice(0, 8)}...`}
                  </div>
                  {logEntry.targetLocationContext.objectKey && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Object:</span>{' '}
                      {logEntry.targetLocationContext.objectKey}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Data
              </label>
              <div className="mt-1 rounded-md bg-muted/50 p-4">
                <pre className="max-h-96 overflow-auto font-mono text-sm">
                  {logEntry.data !== null && logEntry.data !== undefined
                    ? JSON.stringify(logEntry.data, null, 2)
                    : 'null'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export const serverLogsTableColumns: HideableColumnDef<LogEntryDTO>[] = [
  {
    id: 'link',
    cell: ({ row }) => {
      const [modalData, setModalData] = React.useState<{
        isOpen: boolean
        logEntry?: LogEntryDTO
      }>({
        isOpen: false,
      })

      return (
        <div className="size-0 max-w-0 overflow-hidden">
          <LogDetailModal modalData={modalData} setModalData={setModalData} />
          <Link
            onClick={(e) => {
              e.preventDefault()
              setModalData({
                isOpen: true,
                logEntry: row.original,
              })
            }}
            to=""
            className="absolute inset-0"
          />
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
    zeroWidth: true,
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
      <ActorFeedback
        actorIdentifier={row.original.emitterIdentifier}
        title={row.original.emitterIdentifier.toUpperCase()}
        showSubtitle={true}
        subtitle={
          row.original.emitterIdentifier === CORE_IDENTIFIER
            ? 'lombok:core'
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
