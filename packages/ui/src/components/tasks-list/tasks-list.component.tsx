import type { TaskDTO } from '@lombokapp/types'

import { TasksListCard } from './task-list-card.component'

export function TasksList({ tasks }: { tasks: TaskDTO[] }) {
  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task, i) => (
        <TasksListCard key={i} task={task} />
      ))}
    </div>
  )
}
