import { Button, cn } from '@stellariscloud/ui-toolkit'

import { Modal } from '../../design-system/modal/modal'

export const ConfirmRefreshFolderModal = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) => {
  return (
    <Modal title="Refresh folder" onClose={onCancel}>
      <div
        className={cn(
          'bg-secondary hover:bg-secondary-focus flex justify-between gap-4 rounded-md p-4',
        )}
      >
        <div className="flex flex-col gap-4 p-6">
          This will refresh the entire folder, and may take some time.
          <div className="flex gap-4">
            <Button size="lg" onClick={onConfirm}>
              Refresh folder
            </Button>
            <Button size="lg" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
