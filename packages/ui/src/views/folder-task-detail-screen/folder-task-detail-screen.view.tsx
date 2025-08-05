import { useParams } from 'react-router-dom'

import { TaskDetailUI } from '@/src/components/task-detail-ui/task-detail-ui'
import { useFolderContext } from '@/src/pages/folders/folder.context'
import { $api } from '@/src/services/api'

export function FolderTaskDetailScreen() {
  const params = useParams()
  const pathParts = params['*']?.split('/') ?? []
  const taskId = pathParts[2] ?? ''
  const { folderId } = useFolderContext()

  const taskQuery = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/tasks/{taskId}',
    {
      params: {
        path: { folderId, taskId },
      },
    },
    {
      enabled: !!taskId && !!folderId,
      refetchOnWindowFocus: false,
    },
  )

  return (
    <TaskDetailUI
      taskData={taskQuery.data?.task}
      isLoading={taskQuery.isLoading}
      isError={taskQuery.isError}
    />
  )
}
