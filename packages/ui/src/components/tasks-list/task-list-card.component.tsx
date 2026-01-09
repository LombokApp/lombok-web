import { CORE_IDENTIFIER, type TaskDTO } from '@lombokapp/types'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'

export function TasksListCard({ task }: { task: TaskDTO }) {
  return (
    <div className="rounded-md border border-foreground/5 bg-foreground/[.03] p-2 text-sm font-bold">
      <div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'size-2 rounded-full',
                task.success === true
                  ? 'bg-green-500'
                  : task.success === false
                    ? 'bg-red-500'
                    : !task.startedAt
                      ? 'bg-gray-500'
                      : 'bg-yellow-500',
              )}
            />
          </div>

          <div>{task.taskIdentifier}</div>
        </div>
        <div className="flex gap-1 opacity-50">
          <div className="opacity-60">owner:</div>
          {task.ownerIdentifier === CORE_IDENTIFIER
            ? CORE_IDENTIFIER
            : task.ownerIdentifier}
        </div>
      </div>
    </div>
  )
}
