import { TrashIcon } from '@heroicons/react/24/outline'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@stellariscloud/ui-toolkit'

import type { FolderObjectDTO } from '@/src/services/api'

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
        className="top-0 mt-[50%] max-w-md rounded-lg border sm:top-1/2 sm:mt-0 [&_svg]:size-6"
        aria-describedby={undefined}
      >
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2">
            <TrashIcon className="size-6 text-red-500" />
            <DialogTitle className="text-xl font-semibold">
              Delete object
            </DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription className="dark:text-gray-400 text-sm text-gray-600">
          This will permanently delete the object:
          <div className="dark:bg-gray-800 mt-2 rounded-md bg-gray-100 p-2 font-mono text-sm">
            {modalData.folderObject?.objectKey}
          </div>
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
