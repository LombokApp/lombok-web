import type { FolderGetResponse, TaskDTO } from '@lombokapp/types'
import { FolderPushMessage } from '@lombokapp/types'
import {
  Card,
  CardContent,
  CardHeader,
  cn,
  Skeleton,
  TypographyH3,
} from '@lombokapp/ui-toolkit'
import { ListChecks } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router'

import { DateDisplay } from '@/src/components/date-display'
import { useFolderContext } from '@/src/contexts/folder'
import { $api } from '@/src/services/api'

const TASK_PREVIEW_LENGTH = 5

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
                  {task.taskIdentifier}
                </div>
                <div className="text-xs text-muted-foreground">
                  <div className="font-mono">
                    {task.ownerIdentifier.toLowerCase()}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {task.completedAt ? (
                <DateDisplay
                  date={task.completedAt}
                  showTimeSince={false}
                  className="text-xs"
                  dateOptions={{
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }}
                />
              ) : task.startedAt ? (
                'In progress'
              ) : (
                'Pending'
              )}
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
  folderId: folderIdProp,
  objectKey,
  limit = TASK_PREVIEW_LENGTH,
  showHeader = true,
  showViewAllLink = true,
  hideWhenEmpty = false,
}: {
  folderAndPermission?: FolderGetResponse
  folderId?: string
  objectKey?: string
  limit?: number
  showHeader?: boolean
  showViewAllLink?: boolean
  hideWhenEmpty?: boolean
}) => {
  const { folder } = folderAndPermission ?? {}

  const { folderId: folderIdFromContext } = useFolderContext()
  const resolvedFolderId = folderIdProp ?? folder?.id ?? folderIdFromContext

  const listFolderTasksQuery = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/tasks',
    {
      params: {
        path: { folderId: resolvedFolderId },
        query: {
          sort: 'createdAt-desc',
          limit,
          ...(objectKey ? { objectKey } : {}),
        },
      },
    },
    { enabled: !!resolvedFolderId && (!objectKey || !!objectKey) },
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

  useFolderContext(messageHandler)

  const tasks = listFolderTasksQuery.data?.result ?? []
  const totalCount = listFolderTasksQuery.data?.meta.totalCount ?? 0
  const isEmpty = !listFolderTasksQuery.isLoading && tasks.length === 0

  if (hideWhenEmpty && isEmpty) {
    return null
  }

  return (
    <Card className="h-auto">
      {showHeader && (
        <CardHeader className="p-4 pb-1 pt-3">
          <div className="flex items-center justify-between">
            <TypographyH3>
              <div className="flex items-center gap-2">
                <ListChecks className="size-6" />
                Tasks
              </div>
            </TypographyH3>
            {showViewAllLink && (
              <Link
                className="text-xs font-medium text-primary hover:underline"
                to={`/folders/${resolvedFolderId}/tasks`}
              >
                View all tasks
              </Link>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className="overflow-hidden p-4 pt-3">
        {listFolderTasksQuery.isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : tasks.length > 0 ? (
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} folderId={resolvedFolderId} />
            ))}
            {totalCount > limit && (
              <div className="text-center text-xs">
                <Link
                  to={`/folders/${resolvedFolderId}/tasks`}
                  className="text-primary hover:underline"
                >
                  + {totalCount - limit} more tasks
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="py-2 text-center text-sm text-muted-foreground">
            {objectKey
              ? 'No tasks found for this object'
              : 'No tasks found for this folder'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
