import type { StorageProvisionDTO } from '@stellariscloud/types'
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
  StorageProvisionFormValues,
} from './storage-provision-form/storage-provision-form'
import { StorageProvisionForm } from './storage-provision-form/storage-provision-form'

interface ModalData {
  storageProvision: StorageProvisionDTO | undefined
  mutationType: MutationType
}

export const StorageProvisionModal = ({
  modalData,
  setModalData,
  onSubmit,
}: {
  modalData: ModalData
  setModalData: (modalData: ModalData) => void
  onSubmit: (
    mutationType: MutationType,
    values: StorageProvisionFormValues,
  ) => Promise<void>
}) => {
  const { toast } = useToast()

  return (
    <Dialog
      open={!!modalData.storageProvision}
      onOpenChange={(open) => {
        if (!open) {
          setModalData({ ...modalData, storageProvision: undefined })
        }
      }}
    >
      <DialogContent
        className="top-0 mt-[50%] sm:top-1/2 sm:mt-0"
        aria-description={
          modalData.mutationType === 'CREATE'
            ? 'Provision a storage location'
            : 'Edit this storage provision'
        }
      >
        <DialogHeader>
          <DialogTitle>
            {modalData.mutationType === 'CREATE'
              ? 'Provision a storage location'
              : 'Edit this storage provision'}
          </DialogTitle>
          <DialogDescription>
            S3 locations that are provided to your users as managed storage
            options for new folders.
          </DialogDescription>
        </DialogHeader>
        <div className="w-full">
          <StorageProvisionForm
            mutationType={modalData.mutationType}
            value={modalData.storageProvision}
            onCancel={() =>
              setModalData({
                ...modalData,
                storageProvision: undefined,
              })
            }
            onSubmit={(storageProvision) => {
              void onSubmit(modalData.mutationType, storageProvision)
              setModalData({
                ...modalData,
                storageProvision: undefined,
              })
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
