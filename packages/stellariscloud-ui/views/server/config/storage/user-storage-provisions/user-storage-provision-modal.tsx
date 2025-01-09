'use client'

import React from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@stellariscloud/ui-toolkit'
import {
  ServerStorageLocationInputDTO,
  UserStorageProvisionDTO,
} from '@stellariscloud/api-client'
import { UserStorageProvisionForm } from './user-storage-provision-form/user-storage-provision-form'

export type MutationType = 'CREATE' | 'UPDATE'
type ModalData = {
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
    values: ServerStorageLocationInputDTO,
  ) => Promise<void>
}) => {
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
        className="top-0 mt-[50%] rounded-none border-0 sm:top-1/2 sm:mt-0 [&_svg]:size-6"
        aria-describedby={undefined}
      >
        <DialogHeader className="text-left">
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
            onCancel={() =>
              setModalData({ ...modalData, userStorageProvision: undefined })
            }
            onSubmit={(userStorageProvision) => {
              void onSubmit(modalData.mutationType, userStorageProvision)
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { UserStorageProvisionModal }
