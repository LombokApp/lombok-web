import type { AccessKeyPublicDTO } from '@stellariscloud/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import type { QueryObserverResult } from '@tanstack/react-query'

import { AccessKeyRotateForm } from '../access-key-rotate-form/access-key-rotate-form'

export interface AccessKeyModalData {
  isOpen: boolean
  accessKey?: AccessKeyPublicDTO
}

export const AccessKeyModal = ({
  modalData,
  setModalData,
  onSubmit,
  loadBuckets,
  buckets,
}: {
  modalData: AccessKeyModalData
  setModalData: (modalData: AccessKeyModalData) => void
  onSubmit: (input: {
    accessKeyId: string
    secretAccessKey: string
  }) => Promise<void>
  buckets: { name: string }[]
  loadBuckets: () => Promise<
    QueryObserverResult<
      {
        result: {
          name: string
          createdDate?: string
        }[]
      },
      never
    >
  >
}) => {
  void loadBuckets()
  return (
    <Dialog
      open={!!modalData.isOpen}
      onOpenChange={(isNowOpen) =>
        setModalData({ ...modalData, isOpen: isNowOpen })
      }
    >
      <DialogContent
        className="top-0 mt-[50%] sm:top-1/2 sm:mt-0"
        aria-description={`Manage access key ${modalData.accessKey?.accessKeyHashId}`}
      >
        <DialogHeader>
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
            <AccessKeyRotateForm onSubmit={onSubmit} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div>
            <TypographyH3>Buckets</TypographyH3>
            <div>
              {buckets.map(({ name }, i) => (
                <div key={i} className="italic opacity-50">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
