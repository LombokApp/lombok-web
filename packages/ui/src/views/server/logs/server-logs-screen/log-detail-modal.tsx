import { type LogEntryDTO } from '@lombokapp/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@lombokapp/ui-toolkit/components'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'

import { DateDisplay } from '@/src/components/date-display'
import { getLevelColor } from '@/src/utils/level-utils'

interface LogDetailModalProps {
  modalData: {
    isOpen: boolean
    logEntry?: LogEntryDTO
  }
  setModalData: (modalData: { isOpen: boolean; logEntry?: LogEntryDTO }) => void
}

export const LogDetailModal = ({
  modalData,
  setModalData,
}: LogDetailModalProps) => {
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
