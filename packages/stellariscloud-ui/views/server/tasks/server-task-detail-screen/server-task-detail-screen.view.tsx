import type { TaskDTO } from '@stellariscloud/api-client'
import React from 'react'

import { apiClient } from '../../../../services/api'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from '@stellariscloud/ui-toolkit'
import { ServerTaskAttributesList } from '../../../../components/server-task-attributes-list/server-task-attributes-list'

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
    <>
      <div className={cn('items-center flex flex-1 flex-col gap-6 h-full')}>
        <div className="container flex-1 flex flex-col gap-4">
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
    </>
  )
}
