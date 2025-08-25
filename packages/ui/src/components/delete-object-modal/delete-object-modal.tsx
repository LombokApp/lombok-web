import type { FolderObjectDTO } from '@lombokapp/types'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@lombokapp/ui-toolkit'
import { Trash } from 'lucide-react'

export interface DeleteObjectModalData {
  isOpen: boolean
  folderObject?: FolderObjectDTO
}

export const DeleteObjectModal = ({
  modalData,
  setModalData,
  onConfirm,
}: {
  modalData: DeleteObjectModalData
  setModalData: (modalData: DeleteObjectModalData) => void
  onConfirm: () => Promise<void>
}) => {
  const handleCancel = () => {
    setModalData({ ...modalData, isOpen: false })
  }

  const handleConfirm = async () => {
    await onConfirm()
    setModalData({ ...modalData, isOpen: false })
  }

  return (
    <Dialog
      open={!!modalData.isOpen}
      onOpenChange={(isNowOpen) =>
        setModalData({ ...modalData, isOpen: isNowOpen })
      }
    >
      <DialogContent
        className="top-0 mt-[50%] sm:top-1/2 sm:mt-0"
        aria-description={`Delete object ${modalData.folderObject?.objectKey}`}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Trash className="size-6 text-destructive" />
            <DialogTitle>Delete object</DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription>
          Do you want to permanently delete this object? This action cannot be
          undone.
          <br />
          <br />
          <span className="clear-left rounded-md font-mono font-bold">
            {modalData.folderObject?.objectKey}
          </span>
        </DialogDescription>
        <DialogFooter className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
