import type { FolderAndPermission } from '@stellariscloud/api-client'
import { Button } from '@stellariscloud/design-system'
import clsx from 'clsx'
import React from 'react'

export const FolderCard = ({
  className,
  folderAndPermission,
  onForget,
}: {
  folderAndPermission: FolderAndPermission
  className?: string
  onForget?: () => void
}) => {
  const handleDelete = React.useCallback(
    (_e: React.MouseEvent) => {
      onForget?.()
    },
    [onForget],
  )

  return (
    <div
      className={clsx(
        'flex gap-4 justify-between rounded-md p-4 bg-primary hover:bg-primary-focus text-white min-w-[24rem] min-h-[14rem]',
        className,
      )}
    >
      <div className="flex flex-col">
        <div className="text-xl">{folderAndPermission.folder.name}</div>
        <div className="text-[.6rem] pb-2">
          <div className="">{folderAndPermission.folder.id}</div>
        </div>
        <div className="text-[.6rem] pb-2">
          <div className="text-sm">Bucket Name</div>
          <div className="">{folderAndPermission.folder.bucket}</div>
        </div>
        {
          <div className="text-[.6rem] pb-2">
            <div className="text-sm">Prefix</div>
            <div className="">
              {folderAndPermission.folder.prefix ? (
                folderAndPermission.folder.prefix
              ) : (
                <span className="italic">none</span>
              )}
            </div>
          </div>
        }
        <div className="text-xs">
          <div className="text-sm">Endpoint</div>
          <span className="opacity-80">
            {folderAndPermission.folder.endpoint}
          </span>
        </div>
      </div>
      {onForget && (
        <Button size="xs" preventDefaultOnClick onClick={handleDelete}>
          Forget
        </Button>
      )}
    </div>
  )
}
