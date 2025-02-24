import { Button, cn } from '@stellariscloud/ui-toolkit'

import { Modal } from '../../design-system/modal/modal'

export const ConfirmForgetFolderModal = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) => {
  return (
    <Modal title="Delete folder" onClose={onCancel}>
      <div
        className={cn(
          'bg-secondary hover:bg-secondary-focus flex justify-between gap-4 rounded-md p-4',
        )}
      >
        <div className="flex flex-col gap-4 p-6">
          This will delete the folder but not the contents.
          <div className="flex gap-4">
            <Button size="lg" variant={'destructive'} onClick={onConfirm}>
              Delete folder
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
