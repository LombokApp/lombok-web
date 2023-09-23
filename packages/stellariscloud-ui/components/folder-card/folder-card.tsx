import { FolderIcon, KeyIcon } from '@heroicons/react/24/outline'
import type { FolderAndPermission } from '@stellariscloud/api-client'
import clsx from 'clsx'
import React from 'react'

import { Icon } from '../../design-system/icon'

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
        'col-span-1 bg-white rounded-xl dark:bg-gray-800 dark:hover:bg-gray-700 shadow transition duration-200 w-full',
        className,
      )}
    >
      <div className="flex p-6 gap-4">
        <div className="h-16 w-16 flex items-center justify-center flex-shrink-0 rounded-full bg-blue-500 dark:bg-blue-700">
          <Icon size="md" className="text-gray-50" icon={FolderIcon} />
        </div>
        <div className="flex flex-col items-start w-full overflow-hidden">
          <h3 className="truncate text-2xl font-bold text-gray-900 dark:text-white w-full">
            {folder.name}
          </h3>
          <div className="overflow-hidden w-full">
            <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-0 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
              <div className="flex gap-2 items-center">
                <Icon
                  icon={KeyIcon}
                  className="dark:text-yellow-800 text-yellow-800"
                  size="xs"
                />
                <span className="text-[80%]">{folder.accessKeyId}</span>
              </div>
            </span>
          </div>
          <div className="overflow-hidden w-full">
            <div className="truncate text-md text-gray-500">
              {folder.endpoint}/
              <span className="font-semibold">{folder.bucket}</span>
            </div>
          </div>
          {folder.prefix && (
            <p className="truncate text-sm text-gray-500">
              <span className="uppercase italic text-xs font-light">
                prefix
              </span>
              : <span className="italic">&ldquo;{folder.prefix}&rdquo;</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
