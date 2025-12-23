import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@lombokapp/ui-toolkit/components/dialog'
import { Dialog } from '@lombokapp/ui-toolkit/components/dialog/dialog'
import React from 'react'

interface ModalData {
  isOpen: boolean
}

interface FolderSettingsModalProps {
  modalData: ModalData
  setModalData: (modalData: ModalData) => void
  title: string
  description: string
  ariaDescription?: string
  children: React.ReactNode
}

export const FolderSettingsModal = ({
  modalData,
  setModalData,
  title,
  description,
  ariaDescription,
  children,
}: FolderSettingsModalProps) => {
  return (
    <Dialog
      open={modalData.isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setModalData({ ...modalData, isOpen: false })
        }
      }}
    >
      <DialogContent
        className="top-0 mt-[50%] sm:top-1/2 sm:mt-0"
        aria-description={ariaDescription ?? description}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="w-full">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
