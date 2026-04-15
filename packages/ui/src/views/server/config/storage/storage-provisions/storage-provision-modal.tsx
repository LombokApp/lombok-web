import type {
  StorageProvision,
  StorageProvisionInputDTO,
  StorageProvisionUpdateDTO,
} from '@lombokapp/types'
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@lombokapp/ui-toolkit/components/dialog'
import { Dialog } from '@lombokapp/ui-toolkit/components/dialog/dialog'
import { useToast } from '@lombokapp/ui-toolkit/hooks'

import { StorageProvisionForm } from './storage-provision-form/storage-provision-form'

type ModalData =
  | {
      storageProvision: Partial<StorageProvisionInputDTO>
      mutationType: 'CREATE'
      open: boolean
    }
  | {
      storageProvision: StorageProvision
      mutationType: 'UPDATE'
      open: boolean
    }

export const StorageProvisionModal = ({
  modalData,
  setModalData,
  onSubmit,
}: {
  modalData: ModalData
  setModalData: (modalData: ModalData) => void
  onSubmit: (
    payload:
      | {
          mutationType: 'UPDATE'
          values: StorageProvisionUpdateDTO
        }
      | {
          mutationType: 'CREATE'
          values: StorageProvisionInputDTO
        },
  ) => Promise<void>
}) => {
  const { toast } = useToast()

  return (
    <Dialog
      open={modalData.open}
      onOpenChange={(open) => {
        if (!open) {
          setModalData({
            storageProvision: {},
            mutationType: 'CREATE',
            open: true,
          })
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
          {modalData.mutationType === 'CREATE' ? (
            <StorageProvisionForm
              input={{ mutationType: 'CREATE', values: undefined }}
              onCancel={() =>
                setModalData({
                  mutationType: 'CREATE',
                  storageProvision: {},
                  open: false,
                })
              }
              onSubmit={(payload: {
                mutationType: 'CREATE'
                values: StorageProvisionInputDTO
              }) => {
                void onSubmit(payload).then(() => {
                  toast({ title: 'User storage provision created.' })
                  setModalData({
                    mutationType: 'CREATE',
                    storageProvision: {},
                    open: false,
                  })
                })
              }}
            />
          ) : modalData.storageProvision.id ? (
            <StorageProvisionForm
              input={{
                mutationType: 'UPDATE',
                values: modalData.storageProvision,
              }}
              onCancel={() =>
                setModalData({
                  mutationType: 'CREATE',
                  storageProvision: {},
                  open: false,
                })
              }
              onSubmit={(payload: {
                mutationType: 'UPDATE'
                values: StorageProvisionUpdateDTO
              }) => {
                void onSubmit(payload).then(() => {
                  toast({ title: 'User storage provision updated.' })
                  setModalData({
                    mutationType: 'CREATE',
                    storageProvision: {},
                    open: false,
                  })
                })
              }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
