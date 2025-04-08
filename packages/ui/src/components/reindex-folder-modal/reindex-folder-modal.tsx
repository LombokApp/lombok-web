'use client'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@stellariscloud/ui-toolkit'

export interface ReindexFolderModalData {
  isOpen: boolean
}

const ReindexFolderModal = ({
  modalData,
  setModalData,
  onSubmit,
}: {
  modalData: ReindexFolderModalData
  setModalData: (modalData: ReindexFolderModalData) => void
  onSubmit: () => Promise<void>
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
        aria-describedby={undefined}
      >
        <DialogHeader className="text-left">
          <DialogTitle>Reindex folder</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          This will reindex the entire folder, and may take some time.
        </DialogDescription>
        <DialogFooter>
          <div className="flex gap-4">
            <Button
              variant={'link'}
              onClick={() => setModalData({ isOpen: false })}
            >
              Cancel
            </Button>
            <Button variant={'outline'} onClick={() => void onSubmit()}>
              Reindex
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { ReindexFolderModal }
