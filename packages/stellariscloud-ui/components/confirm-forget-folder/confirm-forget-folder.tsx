import { Button, Heading } from '@stellariscloud/design-system'
import clsx from 'clsx'
import React from 'react'

export const ConfirmForgetFolder = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) => {
  return (
    <div
      className={clsx(
        'flex gap-4 justify-between rounded-md p-4 bg-secondary hover:bg-secondary-focus text-white min-w-[24rem] min-h-[14rem]',
      )}
    >
      <div className="flex flex-col gap-4 p-6">
        <Heading level={4}>
          This will forget the folder without deleting the objects
        </Heading>
        <div className="flex gap-4">
          <Button
            size="lg"
            variant="primary"
            preventDefaultOnClick
            onClick={onConfirm}
          >
            Forget folder
          </Button>
          <Button
            size="lg"
            variant={'ghost'}
            preventDefaultOnClick
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
