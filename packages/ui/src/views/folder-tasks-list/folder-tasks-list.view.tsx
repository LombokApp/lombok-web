import type { FolderGetResponse, TaskDTO } from '@stellariscloud/api-client'
import {
  Card,
  CardContent,
  CardHeader,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import { ListChecks } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

import { TasksList } from '../../components/tasks-list/tasks-list.component'
import { Icon } from '../../design-system/icon'
import { apiClient } from '../../services/api'

export const FolderTasksList = ({
  folderAndPermission,
}: {
  folderAndPermission?: FolderGetResponse
}) => {
  const { folder } = folderAndPermission ?? {}
  const [tasks, setTasks] = React.useState<TaskDTO[]>()

  const fetchTasks = React.useCallback(() => {
    if (folder?.id) {
      void apiClient.tasksApi
        .listFolderTasks({ folderId: folder.id })
        .then((resp) => setTasks(resp.data.result))
    }
  }, [folder?.id])

  React.useEffect(() => {
    if (folder?.id) {
      fetchTasks()
    }
  }, [fetchTasks, folder?.id])

  return (
    <Card className="bg-transparent">
      <CardHeader className="p-4 pb-1 pt-3">
        <div className="flex flex-col">
          <TypographyH3>
            <div className="flex items-center gap-2">
              <Icon icon={ListChecks} size="md" />
              Tasks
            </div>
          </TypographyH3>
          <Link
            className="text-xs italic underline opacity-50"
            to={`/folders/${folder?.id}/tasks`}
          >
            view all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {tasks && <TasksList tasks={tasks} />}
      </CardContent>
    </Card>
  )
}
