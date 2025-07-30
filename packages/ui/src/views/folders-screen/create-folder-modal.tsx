import type {
  FolderCreateInputDTO,
  UserStorageProvisionDTO,
} from '@stellariscloud/types'
import {
  Dialog,
  DialogContent,
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
  onSubmit,
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
        className="top-0 mt-[50%] sm:top-1/2 sm:mt-0"
        aria-description={'Create a folder'}
      >
        <DialogHeader>
          <DialogTitle>Create a folder</DialogTitle>
        </DialogHeader>
        <div className="w-full">
          <CreateFolderForm
            onCancel={() => setModalData({ ...modalData, isOpen: false })}
            onSubmit={(v) => onSubmit(v)}
            userStorageProvisions={modalData.userStorageProvisions}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { CreateFolderModal }
