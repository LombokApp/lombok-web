import type { FolderGetResponse, TaskDTO } from '@stellariscloud/api-client'
import React from 'react'

import {
  Card,
  CardContent,
  CardHeader,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import { apiClient } from '../../services/api'
import { TasksList } from '../../components/tasks-list/tasks-list.component'
import { ListChecks } from 'lucide-react'
import { Icon } from '../../design-system/icon'
import Link from 'next/link'

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
        .listTasks({ folderId: folder?.id })
        .then((resp) => setTasks(resp.data.result))
    }
  }, [folder?.id])

  React.useEffect(() => {
    if (folder?.id) {
      void fetchTasks()
    }
  }, [folder?.id])

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
            className="text-xs opacity-50 underline italic"
            href={`/folders/${folder?.id}/tasks`}
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
