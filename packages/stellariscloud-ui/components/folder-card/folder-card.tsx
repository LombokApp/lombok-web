import { KeyIcon } from '@heroicons/react/24/outline'
import type { FolderAndPermission } from '@stellariscloud/api-client'
import clsx from 'clsx'
import React from 'react'

import { Avatar } from '../../design-system/avatar'
import { Badge } from '../../design-system/badge/badge'

export const FolderCard = ({
  className,
  folderAndPermission: { folder },
  onForget,
}: {
  folderAndPermission: FolderAndPermission
  className?: string
  onForget?: () => void
}) => {
  const _handleDelete = React.useCallback(
    (_e: React.MouseEvent) => {
      onForget?.()
    },
    [onForget],
  )

  return (
    <div
      className={clsx(
        'col-span-1 bg-white rounded-xl dark:bg-black/25 dark:hover:bg-indigo-200/5 dark:hover:border-transparent shadow transition duration-200 w-full',
        className,
      )}
    >
      <div className="flex p-6 gap-4">
        <div className="h-16 w-16 flex items-center justify-center flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-700">
          <Avatar uniqueKey={folder.id} />
        </div>
        <div className="flex flex-col items-start w-full overflow-hidden">
          <div className="flex flex-wrap gap-2">
            <h3 className="text-2xl font-bold text-gray-600 dark:text-white">
              {folder.name}
            </h3>
            <div className="overflow-hidden w-full">
              <Badge style="warn" icon={KeyIcon}>
                {folder.contentLocation.accessKeyId}
              </Badge>
            </div>
          </div>
          <div className="overflow-hidden w-full">
            <div className="truncate text-md text-gray-400">
              {folder.contentLocation.endpoint}/
              <span className="font-semibold">
                {folder.contentLocation.bucket}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
