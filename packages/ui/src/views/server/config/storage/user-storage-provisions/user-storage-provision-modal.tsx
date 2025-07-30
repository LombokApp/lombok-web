import type { UserStorageProvisionDTO } from '@stellariscloud/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  useToast,
} from '@stellariscloud/ui-toolkit'

import type {
  MutationType,
  UserStorageProvisionFormValues,
} from './user-storage-provision-form/user-storage-provision-form'
import { UserStorageProvisionForm } from './user-storage-provision-form/user-storage-provision-form'

interface ModalData {
  userStorageProvision: UserStorageProvisionDTO | undefined
  mutationType: MutationType
}

const UserStorageProvisionModal = ({
  modalData,
  setModalData,
  onSubmit,
}: {
  modalData: ModalData
  setModalData: (modalData: ModalData) => void
  onSubmit: (
    mutationType: MutationType,
    values: UserStorageProvisionFormValues,
  ) => Promise<void>
}) => {
  const { toast } = useToast()

  return (
    <Dialog
      open={!!modalData.userStorageProvision}
      onOpenChange={(open) => {
        if (!open) {
          setModalData({ ...modalData, userStorageProvision: undefined })
        }
      }}
    >
      <DialogContent
        className="top-0 mt-[50%] sm:top-1/2 sm:mt-0"
        aria-description={
          modalData.mutationType === 'CREATE'
            ? 'Add a user storage provision'
            : 'Edit this user storage provision'
        }
      >
        <DialogHeader>
          <DialogTitle>
            {modalData.mutationType === 'CREATE' ? 'Add a' : 'Edit a'} user
            storage provision.
          </DialogTitle>
          <DialogDescription>
            S3 locations that are provided to your users as managed storage
            options for new folders.
          </DialogDescription>
        </DialogHeader>
        <div className="w-full">
          <UserStorageProvisionForm
            mutationType={modalData.mutationType}
            value={modalData.userStorageProvision}
            onCancel={() =>
              setModalData({ ...modalData, userStorageProvision: undefined })
            }
            onSubmit={(userStorageProvision) => {
              void onSubmit(modalData.mutationType, userStorageProvision)
              setModalData({ ...modalData, userStorageProvision: undefined })
              toast({
                title: 'User storage provision created.',
              })
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { UserStorageProvisionModal }
