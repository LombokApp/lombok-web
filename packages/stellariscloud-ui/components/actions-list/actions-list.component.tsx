import { PlayIcon } from '@heroicons/react/24/outline'
import { Icon, IconProps } from '../../design-system/icon'
import { Button } from '@stellariscloud/ui-toolkit'

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
      <div className="flex flex-col flex-1 gap-1 bg-foreground/5 p-2 mb-2 rounded-md">
        <div className="flex items-center gap-2">
          <Icon icon={PlayIcon} size="md" />
          <div className="text-lg font-bold">Actions</div>
        </div>
      </div>
      <ul className="space-y-3 my-4">
        {actionItems.map((actionItem) => (
          <li key={actionItem.id} className="overflow-hidden border rounded-lg">
            <button
              onClick={actionItem.onExecute}
              className="p-2 px-4 text-foreground/60"
            >
              <div className="flex items-start gap-2">
                <div className="flex flex-col flex-1 gap-1">
                  <div className="flex items-center gap-2">
                    <Icon icon={actionItem.icon} size="sm" className="" />
                    <div className="text-md font-bold text-foreground/80">
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
