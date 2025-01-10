import type { FolderObjectDTO } from '@stellariscloud/api-client'
import { Button, cn } from '@stellariscloud/ui-toolkit'
import React from 'react'

import { TypographyH3 } from '@/components'

import { Modal } from '../../design-system/modal/modal'

export const ConfirmDeleteModal = ({
  onConfirm,
  onCancel,
  folderObject,
}: {
  onConfirm: () => void
  onCancel: () => void
  folderObject: FolderObjectDTO
}) => {
  return (
    <Modal title="Delete Object" onClose={onCancel}>
      <div
        className={cn(
          'bg-secondary hover:bg-secondary-focus flex min-h-56 min-w-96 justify-between gap-4 rounded-md p-4 text-white',
        )}
      >
        <div className="flex flex-col gap-4 p-6">
          <TypographyH3>This will permanently delete the object</TypographyH3>
          <div>
            <em>{folderObject.objectKey}</em>
          </div>
          <div className="flex gap-4">
            <Button size="lg" onClick={onConfirm}>
              Delete
            </Button>
            <Button size="lg" variant={'secondary'} onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
