import { FolderIcon } from '@heroicons/react/24/outline'

import { Icon } from '../../design-system/icon'

export function CreateFolderStartPanel({ onCreate }: { onCreate: () => void }) {
  return (
    <button onClick={onCreate} className="h-full w-full group">
      <div className="bg-white/70 dark:bg-gray-600/10 group-hover:bg-gray-200 dark:group-hover:bg-gray-500/10 border-2 rounded-lg border-dashed border-gray-700 group-hover:border-gray-900 dark:group-hover:border-gray-700 h-full duration-200 opacity-50">
        <div className="text-center flex flex-col justify-around items-center p-6 h-full">
          <Icon
            size="lg"
            icon={FolderIcon}
            className="text-gray-700 dark:text-white duration-200"
          />
          <p className="mt-1 text-sm group-hover:text-gray-900 dark:text-white dark:group-hover:text-white duration-200">
            Create a new folder
          </p>
        </div>
      </div>
    </button>
  )
}
