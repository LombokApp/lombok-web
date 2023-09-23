import { ArrowPathIcon, FolderIcon } from '@heroicons/react/24/outline'

import { Button } from '../../design-system/button/button'
import { Icon } from '../../design-system/icon'

export function FolderEmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="text-center flex flex-col items-center">
      <Icon
        size="lg"
        icon={FolderIcon}
        className="text-gray-700 dark:text-gray-200"
      />
      <h3 className="mt-2 text-sm font-semibold dark:text-gray-200 text-gray-700">
        No objects
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-200">
        Try refreshing the folder.
      </p>
      <div className="flex justify-center mt-6">
        <Button primary onClick={onRefresh}>
          <Icon icon={ArrowPathIcon} size="sm" className="text-white" />
          Refresh
        </Button>
      </div>
    </div>
  )
}
