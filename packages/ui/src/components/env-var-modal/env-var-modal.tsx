import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@stellariscloud/ui-toolkit'

import { EnvVarForm } from '../env-var-form/env-var-form'

export function EnvVarModal({
  isOpen,
  onClose,
  envVars,
  onSubmit,
}: {
  isOpen: boolean
  onClose: () => void
  envVars: Record<string, string>
  onSubmit: (envVars: { key: string; value: string }[]) => Promise<void>
}) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        className="top-0 mt-[50%] sm:top-1/2 sm:mt-0"
        aria-description="Edit worker environment variables"
      >
        <DialogHeader>
          <DialogTitle>Edit Worker Environment Variables</DialogTitle>
        </DialogHeader>
        <EnvVarForm
          envVars={Object.entries(envVars).map(([key, value]) => ({
            key,
            value,
          }))}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}
