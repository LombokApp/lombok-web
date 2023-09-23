import clsx from 'clsx'
import React from 'react'

import { Button } from '../../design-system/button/button'
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
        className={clsx(
          'flex gap-4 justify-between rounded-md p-4 bg-secondary hover:bg-secondary-focus',
        )}
      >
        <div className="flex flex-col gap-4 p-6">
          This will refresh the entire folder, and may take some time.
          <div className="flex gap-4">
            <Button size="lg" primary preventDefaultOnClick onClick={onConfirm}>
              Refresh folder
            </Button>
            <Button size="lg" preventDefaultOnClick onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
