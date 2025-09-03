import { useParams } from 'react-router'

import { TaskDetailUI } from '@/src/components/task-detail-ui/task-detail-ui'
import { useFolderContext } from '@/src/contexts/folder'
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
    <div className="flex flex-1 flex-col items-center">
      <div className="container flex flex-1 flex-col overflow-y-scroll py-6">
        <div className="flex w-full flex-1 flex-col">
          <TaskDetailUI
            taskData={taskQuery.data?.task}
            isLoading={taskQuery.isLoading}
            isError={taskQuery.isError}
          />
        </div>
      </div>
    </div>
  )
}
