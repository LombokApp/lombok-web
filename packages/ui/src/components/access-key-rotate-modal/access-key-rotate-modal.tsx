import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  TypographySubtitle,
} from '@stellariscloud/ui-toolkit'

import { AccessKeyRotateForm } from '@/src/components/access-key-rotate-form/access-key-rotate-form'

export const AccessKeyRotateModal = ({
  isOpen,
  setIsOpen,
  title = 'Rotate key',
  onSubmit,
  accessKey,
}: {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  title?: string
  onSubmit: (input: {
    accessKeyId: string
    secretAccessKey: string
  }) => Promise<void>
  accessKey?: {
    accessKeyHashId: string
    accessKeyId: string
    endpoint: string
    region: string
  }
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(isNowOpen) => setIsOpen(isNowOpen)}>
      <DialogContent className="top-0 mt-[50%] sm:top-1/2 sm:mt-0">
        <DialogHeader>
          <DialogTitle>
            <div className="flex flex-col">
              {title}
              <div className="font-normal">
                <TypographySubtitle>
                  Access Key Hash Id: {accessKey?.accessKeyHashId}
                </TypographySubtitle>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        {accessKey && (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            <div className="mb-2 font-medium text-foreground">
              You are rotating this server key:
            </div>
            <div className="flex flex-col gap-2">
              <div>
                <span className="opacity-70">Access Key ID:</span>{' '}
                <span className="font-mono">{accessKey.accessKeyId}</span>
              </div>
              <div>
                <span className="opacity-70">Endpoint:</span>{' '}
                <span className="font-mono">{accessKey.endpoint}</span>
              </div>
              <div>
                <span className="opacity-70">Region:</span>{' '}
                <span className="font-mono">{accessKey.region || 'auto'}</span>
              </div>
            </div>
            <div className="mt-3 text-xs">
              This rotation updates the credentials everywhere they are used on
              the server:
              <ul className="ml-5 list-disc">
                <li>Server Storage Location</li>
                <li>User Storage Provisions</li>
                <li>User folders using those provisions</li>
              </ul>
            </div>
          </div>
        )}
        <div className="py-2">
          <AccessKeyRotateForm onSubmit={onSubmit} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
