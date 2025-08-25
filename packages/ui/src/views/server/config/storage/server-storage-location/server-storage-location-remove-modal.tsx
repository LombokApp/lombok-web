import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@lombokapp/ui-toolkit'

const ServerStorageLocationRemoveModal = ({
  modalData,
  setModalData,
  onConfirm,
}: {
  modalData: { open: boolean }
  setModalData: (modalData: { open: boolean }) => void
  onConfirm: () => Promise<void>
}) => {
  const { open } = modalData

  return (
    <Dialog
      open={open}
      onOpenChange={(_open) => {
        setModalData({ ...modalData, open: _open })
      }}
    >
      <DialogContent
        className="top-0 mt-[50%] sm:top-1/2 sm:mt-0"
        aria-description="Remove server storage location"
      >
        <DialogHeader>
          <DialogTitle>Remove server storage location</DialogTitle>
          <DialogDescription>
            This will uninstall any apps which rely on server storage.
          </DialogDescription>
        </DialogHeader>
        <Button variant="destructive" onClick={() => void onConfirm()}>
          Confirm Remove Server Storage Location
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export { ServerStorageLocationRemoveModal }
