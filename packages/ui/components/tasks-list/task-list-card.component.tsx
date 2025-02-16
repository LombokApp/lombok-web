import type { TaskDTO } from '@stellariscloud/api-client'
import { cn } from '@stellariscloud/ui-toolkit'

export function TasksListCard({ task }: { task: TaskDTO }) {
  return (
    <div className="rounded-md border border-foreground/5 bg-foreground/[.03] p-2 text-sm font-bold">
      <div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'size-2 rounded-full',
                task.completedAt
                  ? 'bg-green-500'
                  : task.errorAt
                    ? 'bg-red-500'
                    : !task.startedAt
                      ? 'bg-gray-500'
                      : 'bg-yellow-500',
              )}
            />
          </div>

          <div>{task.taskKey}</div>
        </div>
        <div className="flex gap-1 opacity-50">
          <div className="opacity-60">owner:</div>
          {task.ownerIdentifier === 'CORE'
            ? 'core'
            : `app:${task.ownerIdentifier.split(':').at(-1)?.toLowerCase()}`}
        </div>
      </div>
    </div>
  )
}
