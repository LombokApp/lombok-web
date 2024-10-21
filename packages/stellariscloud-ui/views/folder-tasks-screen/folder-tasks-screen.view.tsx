import React from 'react'
import { tasksTableColumns } from './task-table-columns'
import { DataTable, cn } from '@stellariscloud/ui-toolkit'
import { TaskDTO } from '@stellariscloud/api-client'
import { useFolderContext } from '../../contexts/folder.context'
import { apiClient } from '../../services/api'

export function FolderTasksScreen() {
  const [tasks, setTasks] = React.useState<TaskDTO[]>()
  const { folder } = useFolderContext()
  const fetchTasks = React.useCallback(() => {
    if (folder?.id) {
      void apiClient.tasksApi
        .listTasks({
          folderId: folder?.id,
          includeComplete: 'true',
          includeFailed: 'true',
          includeRunning: 'true',
          includeWaiting: 'true',
        })
        .then((resp) => setTasks(resp.data.result))
    }
  }, [folder?.id])

  React.useEffect(() => {
    if (folder?.id) {
      void fetchTasks()
    }
  }, [folder?.id])

  return (
    <div
      className={cn(
        'items-center flex flex-1 flex-col h-full overflow-x-hidden overflow-y-auto p-8',
      )}
    >
      <div className="container flex-1 flex flex-col">
        <DataTable data={tasks ?? []} columns={tasksTableColumns} />
      </div>
    </div>
  )
}
