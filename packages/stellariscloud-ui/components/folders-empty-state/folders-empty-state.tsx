import { PlusIcon } from '@heroicons/react/20/solid'
import { FolderIcon } from '@heroicons/react/24/outline'

import { Button } from '../../design-system/button/button'
import { Icon } from '../../design-system/icon'

export function FoldersEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center flex flex-col items-center">
      <Icon size="lg" icon={FolderIcon} />
      <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
        No folders
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-white">
        Get started by creating a new folder.
      </p>
      <div className="flex justify-center mt-6">
        <Button primary onClick={onCreate}>
          <Icon icon={PlusIcon} size="sm" className="text-white" />
          New Folder
        </Button>
      </div>
    </div>
  )
}
