'use client'

import type { AccessKeyDTO } from '@stellariscloud/api-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@stellariscloud/ui-toolkit'

import { AccessKeyRotateForm } from '../../components/access-key-rotate-form/access-key-rotate-form'

export interface AccessKeyRotateModalData {
  isOpen: boolean
  accessKey?: AccessKeyDTO
}

export const AccessKeyRotateModal = ({
  modalData,
  setModalData,
  onSubmit,
}: {
  modalData: AccessKeyRotateModalData
  setModalData: (modalData: AccessKeyRotateModalData) => void
  onSubmit: (input: {
    accessKeyId: string
    secretAccessKey: string
  }) => Promise<void>
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
          <DialogTitle>
            <div className="flex flex-col">
              <span>Access Key</span>
              <span className="font-mono text-xs font-light text-muted-foreground">
                ID: {modalData.accessKey?.accessKeyHashId}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>
        {modalData.accessKey && (
          <div className="flex flex-col gap-1 rounded-md border p-3 text-muted-foreground">
            <p className="font-mono text-xs">
              Access Key ID: {modalData.accessKey.accessKeyId}
            </p>
            <p className="font-mono text-xs">Secret Access Key: **********</p>
            <p className="font-mono text-xs">
              Endpoint: {modalData.accessKey.endpointDomain}
            </p>
            <p className="font-mono text-xs">
              Region: {modalData.accessKey.region}
            </p>
            <p className="font-mono text-xs">
              Folders: {modalData.accessKey.folderCount}
            </p>
          </div>
        )}
        <div className="pt-4">
          <div className="flex flex-col">
            <span className="text-lg font-medium">Rotate key</span>
            <span className="text-sm text-muted-foreground">
              Update the access key id and secret access key below.
            </span>
          </div>
          <div className="py-4">
            <AccessKeyRotateForm onSubmit={(input) => onSubmit(input)} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
