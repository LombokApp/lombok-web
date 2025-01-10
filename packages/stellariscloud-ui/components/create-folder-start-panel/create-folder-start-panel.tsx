import { FolderIcon } from '@heroicons/react/24/outline'
import { Card } from '@stellariscloud/ui-toolkit'

import { Icon } from '../../design-system/icon'

export function CreateFolderStartPanel({ onCreate }: { onCreate: () => void }) {
  return (
    <button onClick={onCreate} className="group size-full">
      <Card className="size-full">
        <div className="h-full rounded-lg">
          <div className="flex h-full flex-col items-center justify-around p-6 text-center">
            <Icon size="lg" icon={FolderIcon} />
            <p className="mt-1 text-sm">Create a new folder</p>
          </div>
        </div>
      </Card>
    </button>
  )
}
