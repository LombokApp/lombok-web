'use client'

import type { UserDTO } from '@stellariscloud/types'
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
  UserFormValues,
} from './server-user-form/server-user-form'
import { ServerUserForm } from './server-user-form/server-user-form'
export interface ServerUserModalData {
  user: UserDTO | undefined
  mutationType: MutationType
  isOpen: boolean
}

export const ServerUserModal = ({
  modalData,
  setModalData,
  onSubmit,
}: {
  modalData: ServerUserModalData
  setModalData: (modalData: ServerUserModalData) => void
  onSubmit: (
    params:
      | { mutationType: 'CREATE'; values: UserFormValues }
      | { mutationType: 'UPDATE'; values: UserFormValues },
  ) => Promise<void>
}) => {
  const { toast } = useToast()

  return (
    <Dialog
      open={!!modalData.isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setModalData({ ...modalData, user: undefined, isOpen: false })
        }
      }}
    >
      <DialogContent
        className="top-0 mt-[50%] sm:top-1/2 sm:mt-0"
        aria-description={
          modalData.mutationType === 'CREATE'
            ? 'Create a user'
            : 'Edit this user'
        }
      >
        <DialogHeader>
          <DialogTitle>
            {modalData.mutationType === 'CREATE' ? 'Create a' : 'Edit'} user
          </DialogTitle>
          <DialogDescription>
            {modalData.mutationType === 'CREATE'
              ? 'Create a new user account with custom permissions and settings.'
              : 'Update user account details, permissions, and settings.'}
          </DialogDescription>
        </DialogHeader>
        <div className="w-full">
          <ServerUserForm
            mutationType={modalData.mutationType}
            value={modalData.user}
            onCancel={() =>
              setModalData({ ...modalData, user: undefined, isOpen: false })
            }
            onSubmit={(user) => {
              void onSubmit({
                mutationType: modalData.mutationType,
                values: user,
              }).then(() => {
                setModalData({ ...modalData, user: undefined, isOpen: false })
                toast({
                  title: `User ${modalData.mutationType === 'CREATE' ? 'created' : 'updated'} successfully.`,
                })
              })
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
