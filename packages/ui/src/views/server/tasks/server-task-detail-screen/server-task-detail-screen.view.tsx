import { TaskDetailUI } from '@/src/components/task-detail-ui/task-detail-ui'
import { $api } from '@/src/services/api'

export function ServerTaskDetailScreen({ taskId }: { taskId: string }) {
  const taskQuery = $api.useQuery('get', '/api/v1/server/tasks/{taskId}', {
    params: { path: { taskId } },
  })

  return (
    <TaskDetailUI
      taskData={taskQuery.data?.task}
      isLoading={taskQuery.isLoading}
      isError={taskQuery.isError}
    />
  )
}
