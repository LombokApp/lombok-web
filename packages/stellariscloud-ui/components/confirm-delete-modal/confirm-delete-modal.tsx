import type { FolderObjectDTO } from '@stellariscloud/api-client'
import clsx from 'clsx'
import React from 'react'

import { Button } from '../../design-system/button/button'
import { Modal } from '../../design-system/modal/modal'
import { Heading } from '../../design-system/typography'

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
        className={clsx(
          'flex gap-4 justify-between rounded-md p-4 bg-secondary hover:bg-secondary-focus text-white min-w-[24rem] min-h-[14rem]',
        )}
      >
        <div className="flex flex-col gap-4 p-6">
          <Heading level={6}>This will permanently delete the object</Heading>
          <div>
            <em>{folderObject.objectKey}</em>
          </div>
          <div className="flex gap-4">
            <Button size="lg" primary preventDefaultOnClick onClick={onConfirm}>
              Delete
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
