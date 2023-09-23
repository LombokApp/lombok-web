import { KeyIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { S3ConnectionData } from '@stellariscloud/api-client'
import clsx from 'clsx'
import React from 'react'

import { Button } from '../../design-system/button/button'
import { Icon } from '../../design-system/icon'

export const ConnectionCard = ({
  className,
  connection,
  onDelete,
}: {
  connection: S3ConnectionData
  className?: string
  onDelete?: () => void
}) => {
  const handleDelete = React.useCallback(
    (_e: React.MouseEvent) => {
      onDelete?.()
    },
    [onDelete],
  )

  return (
    <div
      className={clsx(
        'col-span-1 bg-white rounded-xl dark:bg-gray-800 shadow transition duration-200 w-full',
        className,
      )}
    >
      <div className="flex p-6 gap-4 relative">
        <div className="absolute right-4 top-4">
          <Button size="sm" onClick={handleDelete} className="w-10 h-10">
            <Icon size="sm" icon={TrashIcon} />
          </Button>
        </div>
        <div className="h-16 w-16 flex items-center justify-center flex-shrink-0 rounded-full bg-amber-100 dark:bg-amber-400 ring-1 ring-yellow-500">
          <Icon size="md" className="text-yellow-800" icon={KeyIcon} />
        </div>
        <div className="flex flex-col items-start w-full overflow-hidden">
          <h3 className="truncate text-2xl font-bold text-gray-900 dark:text-white w-full">
            {connection.name}
          </h3>
          <div className="overflow-hidden w-full">
            <div className="truncate text-sm font-medium text-gray-400">
              Access Key ID: {connection.accessKeyId}
            </div>
          </div>
          <div className="overflow-hidden w-full">
            <div className="truncate text-md text-gray-500">
              {connection.endpoint}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
