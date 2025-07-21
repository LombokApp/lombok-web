import type { LucideProps } from 'lucide-react'
export interface ActionItem {
  key: string
  label: string
  description: string
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>
  >
  onExecute: () => void
  id: string
}

export function ActionsList({ actionItems }: { actionItems: ActionItem[] }) {
  return (
    <ul className="space-y-3">
      {actionItems.map((actionItem) => {
        const IconComponent = actionItem.icon
        return (
          <li key={actionItem.id} className="overflow-hidden rounded-lg border">
            <button
              onClick={actionItem.onExecute}
              className="p-2 px-4 text-foreground/60"
            >
              <div className="flex items-start gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <IconComponent className="size-12" />
                    <div className="text-base font-bold text-foreground/80">
                      {actionItem.label}
                    </div>
                  </div>
                  <div className="text-sm">{actionItem.description}</div>
                </div>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
