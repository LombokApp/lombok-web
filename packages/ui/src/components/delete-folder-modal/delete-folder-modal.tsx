import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@stellariscloud/ui-toolkit'

export interface DeleteFolderModalData {
  isOpen: boolean
}

export const DeleteFolderModal = ({
  modalData,
  setModalData,
  onConfirm,
}: {
  modalData: DeleteFolderModalData
  setModalData: (modalData: DeleteFolderModalData) => void
  onConfirm: () => Promise<void>
}) => {
  return (
    <Dialog
      open={!!modalData.isOpen}
      onOpenChange={(isNowOpen) =>
        setModalData({ ...modalData, isOpen: isNowOpen })
      }
    >
      <DialogContent
        className="top-0 mt-[50%] rounded-none border-0 sm:top-1/2 sm:mt-0 [&_svg]:size-6"
        aria-description="Delete folder"
      >
        <DialogHeader>
          <DialogTitle>Delete folder</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          This action will remove the folder from your account, but will not
          delete any files from the underlying storage.
        </DialogDescription>
        <DialogFooter>
          <div className="flex gap-4">
            <Button
              variant={'outline'}
              onClick={() => setModalData({ isOpen: false })}
            >
              Cancel
            </Button>
            <Button variant={'destructive'} onClick={() => void onConfirm()}>
              Delete
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
