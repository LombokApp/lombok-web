import { FolderIcon } from '@heroicons/react/24/outline'

import { Icon } from '../../design-system/icon'
import { Card } from '@stellariscloud/ui-toolkit'

export function CreateFolderStartPanel({ onCreate }: { onCreate: () => void }) {
  return (
    <button onClick={onCreate} className="h-full w-full group">
      <Card className="h-full w-full">
        <div className="rounded-lg h-full">
          <div className="text-center flex flex-col justify-around items-center p-6 h-full">
            <Icon size="lg" icon={FolderIcon} />
            <p className="mt-1 text-sm">Create a new folder</p>
          </div>
        </div>
      </Card>
    </button>
  )
}
