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
      <DialogContent className="top-0 mt-[50%] rounded-none border-0 sm:top-1/2 sm:mt-0">
        <DialogHeader className="text-left">
          <DialogTitle>Edit Environment Variables</DialogTitle>
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
