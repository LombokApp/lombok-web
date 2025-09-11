import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@lombokapp/ui-toolkit/components/dialog'
import { Dialog } from '@lombokapp/ui-toolkit/components/dialog/dialog'

import { EnvVarForm } from '../env-var-form/env-var-form'

export function EnvironmentVariablesModal({
  isOpen,
  onClose,
  environmentVariables,
  onSubmit,
}: {
  isOpen: boolean
  onClose: () => void
  environmentVariables: Record<string, string>
  onSubmit: (
    environmentVariables: { key: string; value: string }[],
  ) => Promise<void>
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
          environmentVariables={Object.entries(environmentVariables).map(
            ([key, value]) => ({
              key,
              value,
            }),
          )}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}
