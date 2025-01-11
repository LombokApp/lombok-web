import { PlayIcon } from '@heroicons/react/24/outline'

import type { IconProps } from '../../design-system/icon'
import { Icon } from '../../design-system/icon'

export interface ActionItem {
  key: string
  label: string
  description: string
  icon: IconProps['icon']
  onExecute: () => void
  id: string
}

export function ActionsList({ actionItems }: { actionItems: ActionItem[] }) {
  return (
    <div>
      <div className="mb-2 flex flex-1 flex-col gap-1 rounded-md bg-foreground/5 p-2">
        <div className="flex items-center gap-2">
          <Icon icon={PlayIcon} size="md" />
          <div className="text-lg font-bold">Actions</div>
        </div>
      </div>
      <ul className="my-4 space-y-3">
        {actionItems.map((actionItem) => (
          <li key={actionItem.id} className="overflow-hidden rounded-lg border">
            <button
              onClick={actionItem.onExecute}
              className="p-2 px-4 text-foreground/60"
            >
              <div className="flex items-start gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Icon icon={actionItem.icon} size="sm" className="" />
                    <div className="text-base font-bold text-foreground/80">
                      {actionItem.label}
                    </div>
                  </div>
                  <div className="text-sm">{actionItem.description}</div>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
