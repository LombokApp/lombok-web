import type { FolderObjectDTO } from '@stellariscloud/api-client'
import React from 'react'

import { Button } from '@stellariscloud/ui-toolkit'
import { Modal } from '../../design-system/modal/modal'
import { TypographyH3 } from '@/components'
import { cn } from '@stellariscloud/ui-toolkit'

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
          'flex gap-4 justify-between rounded-md p-4 bg-secondary hover:bg-secondary-focus text-white min-w-[24rem] min-h-[14rem]',
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
