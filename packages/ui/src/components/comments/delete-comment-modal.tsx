import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@lombokapp/ui-toolkit/components/dialog'
import { Dialog } from '@lombokapp/ui-toolkit/components/dialog/dialog'
import { Trash2 } from 'lucide-react'

export interface DeleteCommentModalData {
  isOpen: boolean
  commentId?: string
}

export const DeleteCommentModal = ({
  modalData,
  setModalData,
  onConfirm,
}: {
  modalData: DeleteCommentModalData
  setModalData: (modalData: DeleteCommentModalData) => void
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
        aria-description="Delete comment"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="size-6 text-destructive" />
            <DialogTitle>Delete comment</DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to delete this comment? This action cannot be
          undone.
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
