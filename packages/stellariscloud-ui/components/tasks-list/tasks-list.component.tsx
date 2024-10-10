import { QueueListIcon } from '@heroicons/react/24/outline'
import { Icon } from '../../design-system/icon'
import { TaskDTO } from '@stellariscloud/api-client'
import clsx from 'clsx'

export function TasksList({ tasks }: { tasks: TaskDTO[] }) {
  return (
    <div>
      <div className="flex flex-col flex-1 gap-1 bg-foreground/5 p-2 mb-2 rounded-md">
        <div className="flex items-center gap-2">
          <Icon icon={QueueListIcon} size="md" />
          <div className="text-lg font-bold">Tasks</div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {tasks?.map((task, i) => (
          <div
            className="bg-black/20 rounded-md py-2 mx-2 text-sm font-bold"
            key={i}
          >
            {task.ownerIdentifier === 'CORE'
              ? task.taskKey
              : `${task.ownerIdentifier} ${task.taskKey}`}
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  'rounded-full w-3 h-3',
                  task.completedAt
                    ? 'bg-green-500'
                    : task.errorAt
                      ? 'bg-red-500'
                      : !task.startedAt
                        ? 'bg-gray-500'
                        : 'bg-yellow-500',
                )}
              />
              <div className="flex gap-2 items-center font-normal">
                <div className="italic">
                  {task.completedAt
                    ? 'Completed'
                    : task.errorAt
                      ? 'Failed'
                      : !task.startedAt
                        ? 'Not Started'
                        : 'Pending'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
