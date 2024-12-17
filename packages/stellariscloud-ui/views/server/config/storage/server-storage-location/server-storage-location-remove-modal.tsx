'use client'

import React from 'react'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@stellariscloud/ui-toolkit'

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
      onOpenChange={(open) => {
        setModalData({ ...modalData, open })
      }}
    >
      <DialogContent
        className="top-0 mt-[50%] rounded-none border-0 sm:top-1/2 sm:mt-0 [&_svg]:size-6"
        aria-describedby={undefined}
      >
        <DialogHeader className="text-left">
          <DialogTitle>Remove server storage location</DialogTitle>
          <DialogDescription>
            This will uninstall any apps which rely on server storage.
          </DialogDescription>
        </DialogHeader>
        <Button variant="destructive" onClick={onConfirm}>
          Confirm Remove Server Storage Location
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export { ServerStorageLocationRemoveModal }
