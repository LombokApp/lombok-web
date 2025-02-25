'use client'

import type {
  FolderCreateInputDTO,
  UserStorageProvisionDTO,
} from '@stellariscloud/api-client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@stellariscloud/ui-toolkit'

import { CreateFolderForm } from '../../components/create-folder-form/create-folder-form'

export interface CreateFolderModalData {
  isOpen: boolean
  userStorageProvisions: UserStorageProvisionDTO[]
}

const CreateFolderModal = ({
  modalData,
  setModalData,
  // onSubmit,
}: {
  modalData: CreateFolderModalData
  setModalData: (modalData: CreateFolderModalData) => void
  onSubmit: (values: FolderCreateInputDTO) => Promise<void>
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
          <DialogTitle>Create a folder storage provision.</DialogTitle>
          <DialogDescription>
            This creates a new folder, of course.
          </DialogDescription>
        </DialogHeader>
        <div className="w-full">
          <CreateFolderForm
            onCancel={() => setModalData({ ...modalData, isOpen: false })}
            onSubmit={() => Promise.reject(new Error('Not Implemented'))}
            userStorageProvisions={[]}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { CreateFolderModal }
