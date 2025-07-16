import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@stellariscloud/ui-toolkit'

import { ServerTaskAttributesList } from '@/src/components/server-task-attributes-list/server-task-attributes-list'
import { $api } from '@/src/services/api'

export function ServerTaskDetailScreen({ taskId }: { taskId: string }) {
  const { data } = $api.useQuery('get', '/api/v1/server/tasks/{taskId}', {
    params: { path: { taskId } },
  })

  return (
    <div className="flex size-full flex-1 flex-col gap-8 overflow-hidden overflow-y-auto">
      <div className="container flex flex-1 flex-col gap-4">
        <Card className="border-0 bg-transparent">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Task: {data?.task.id}</CardTitle>
            <CardDescription>Key: {data?.task.taskKey}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ServerTaskAttributesList task={data?.task} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
