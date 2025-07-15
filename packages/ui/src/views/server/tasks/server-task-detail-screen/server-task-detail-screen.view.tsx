import type { TaskDTO } from '@stellariscloud/api-client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@stellariscloud/ui-toolkit'
import React from 'react'

import { ServerTaskAttributesList } from '../../../../components/server-task-attributes-list/server-task-attributes-list'
import { apiClient } from '../../../../services/api'

export function ServerTaskDetailScreen({ taskId }: { taskId: string }) {
  const [task, setTask] = React.useState<TaskDTO>()
  React.useEffect(() => {
    if (typeof taskId === 'string') {
      void apiClient.serverTasksApi
        .getTask({ taskId })
        .then((response) => setTask(response.data.task))
    }
  }, [taskId])

  return (
    <div className="flex size-full flex-1 flex-col gap-8 overflow-hidden overflow-y-auto">
      <div className="container flex flex-1 flex-col gap-4">
        <Card className="border-0 bg-transparent">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Task: {task?.id}</CardTitle>
            <CardDescription>Key: {task?.taskKey}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ServerTaskAttributesList task={task} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
