import { FolderPushMessage } from '@stellariscloud/types'
import {
  Card,
  CardContent,
  CardHeader,
  cn,
  Skeleton,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import { ListChecks } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

import type { FolderGetResponse, TaskDTO } from '@/src/services/api'
import { $api } from '@/src/services/api'

import { Icon } from '../../design-system/icon'
import { useFolderContext } from '../../pages/folders/folder.context'

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
              <div className="flex items-center gap-2">
                <div className="font-semibold group-hover:text-primary">
                  {task.taskKey}
                </div>
                <div className="text-xs text-muted-foreground">
                  <div className="font-mono">
                    {task.ownerIdentifier === 'core'
                      ? 'core'
                      : `app:${task.ownerIdentifier.split(':').at(-1)?.toLowerCase()}`}
                  </div>
                </div>
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
          {task.subjectObjectKey && (
            <div className="mt-1 flex gap-1 text-xs text-muted-foreground">
              <div>Object:</div>
              <div className="truncate font-mono">{task.subjectObjectKey}</div>
            </div>
          )}
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

  const listFolderTasksQuery = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/tasks',
    {
      params: {
        path: { folderId: folder?.id ?? '' },
        query: {
          sort: 'createdAt-desc',
          limit: TASK_PREVIEW_LENGTH,
        },
      },
    },
    { enabled: !!folder?.id },
  )

  const messageHandler = React.useCallback(
    (name: FolderPushMessage, _payload: unknown) => {
      if (
        [FolderPushMessage.TASK_ADDED, FolderPushMessage.TASK_UPDATED].includes(
          name,
        )
      ) {
        void listFolderTasksQuery.refetch()
      }
    },
    [listFolderTasksQuery],
  )

  const { folderId } = useFolderContext(messageHandler)

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
            {listFolderTasksQuery.data.result.map((task) => (
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
