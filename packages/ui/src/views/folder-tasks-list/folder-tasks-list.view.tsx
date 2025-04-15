import type { FolderGetResponse, TaskDTO } from '@stellariscloud/api-client'
import {
  Card,
  CardContent,
  CardHeader,
  cn,
  Skeleton,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import { ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Icon } from '../../design-system/icon'
import { useFolderContext } from '../../pages/folders/folder.context'
import { tasksApiHooks } from '../../services/api'

const TASK_PREVIEW_LENGTH = 5

// Custom task card component with link
const TaskCard = ({ task, folderId }: { task: TaskDTO; folderId: string }) => {
  return (
    <Link
      to={`/folders/${folderId}/tasks/${task.id}`}
      className="block transition-colors hover:no-underline"
    >
      <div className="group rounded-md border border-foreground/5 bg-foreground/[.03] p-3 text-sm font-medium transition-all duration-200 hover:border-foreground/10 hover:bg-foreground/[.05]">
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'size-2.5 rounded-full',
                  task.completedAt
                    ? 'bg-green-500'
                    : task.errorAt
                      ? 'bg-red-500'
                      : !task.startedAt
                        ? 'bg-gray-500'
                        : 'bg-yellow-500',
                )}
              />
              <div className="font-semibold group-hover:text-primary">
                {task.taskKey}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {task.completedAt
                ? new Date(task.completedAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : task.startedAt
                  ? 'In progress'
                  : 'Pending'}
            </div>
          </div>
          <div className="mt-1 flex gap-1 text-xs text-muted-foreground">
            <div>Owner:</div>
            <div className="font-mono">
              {task.ownerIdentifier === 'core'
                ? 'core'
                : `app:${task.ownerIdentifier.split(':').at(-1)?.toLowerCase()}`}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export const FolderTasksList = ({
  folderAndPermission,
}: {
  folderAndPermission?: FolderGetResponse
}) => {
  const { folder } = folderAndPermission ?? {}
  const { folderId } = useFolderContext()
  const listFolderTasksQuery = tasksApiHooks.useListFolderTasks(
    {
      folderId,
    },
    {},
  )

  return (
    <Card className="h-auto">
      <CardHeader className="p-4 pb-1 pt-3">
        <div className="flex items-center justify-between">
          <TypographyH3>
            <div className="flex items-center gap-2">
              <Icon icon={ListChecks} size="md" className="text-primary" />
              Tasks
            </div>
          </TypographyH3>
          <Link
            className="text-xs font-medium text-primary hover:underline"
            to={`/folders/${folder?.id}/tasks`}
          >
            View all tasks
          </Link>
        </div>
      </CardHeader>
      <CardContent className="overflow-hidden p-4 pt-3">
        {listFolderTasksQuery.isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : listFolderTasksQuery.data?.result &&
          listFolderTasksQuery.data.result.length > 0 ? (
          <div className="flex flex-col gap-3">
            {listFolderTasksQuery.data.result
              .slice(0, TASK_PREVIEW_LENGTH)
              .map((task) => (
                <TaskCard key={task.id} task={task} folderId={folderId} />
              ))}
            {listFolderTasksQuery.data.meta.totalCount >
              TASK_PREVIEW_LENGTH && (
              <div className="text-center text-xs">
                <Link
                  to={`/folders/${folder?.id}/tasks`}
                  className="text-primary hover:underline"
                >
                  +{' '}
                  {listFolderTasksQuery.data.meta.totalCount -
                    TASK_PREVIEW_LENGTH}{' '}
                  more tasks
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="py-2 text-center text-sm text-muted-foreground">
            No tasks found for this folder
          </div>
        )}
      </CardContent>
    </Card>
  )
}
