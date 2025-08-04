import { Button, cn } from '@stellariscloud/ui-toolkit'
import { useNavigate, useParams } from 'react-router-dom'

import { useFolderContext } from '@/src/pages/folders/folder.context'
import { $api } from '@/src/services/api'

// Define a minimal Task interface for what we need
interface Task {
  id: string
  taskIdentifier: string
  createdAt: string
  updatedAt: string
  ownerIdentifier: string
  subjectObjectKey?: string
  completedAt?: string
  errorAt?: string
  startedAt?: string
  errorCode?: string
  errorMessage?: string
  taskDescription: {
    textKey: string
    textHTML?: string
  }
}

export function FolderTaskDetailScreen() {
  const navigate = useNavigate()
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

  // Get the appropriate color for the status indicator
  const getStatusColor = (task?: {
    completedAt?: string
    errorAt?: string
    startedAt?: string
  }) => {
    if (!task) {
      return 'bg-gray-600'
    }

    if (task.completedAt) {
      return 'bg-green-600'
    } else if (task.errorAt) {
      return 'bg-red-600'
    } else if (!task.startedAt) {
      return 'bg-gray-600'
    } else {
      return 'bg-yellow-600'
    }
  }

  // Get the status text
  const getStatusText = (task?: {
    completedAt?: string
    errorAt?: string
    startedAt?: string
  }) => {
    if (!task) {
      return 'Unknown'
    }

    if (task.completedAt) {
      return 'Complete'
    } else if (task.errorAt) {
      return 'Failed'
    } else if (!task.startedAt) {
      return 'Pending'
    } else {
      return 'Running'
    }
  }

  const taskData = taskQuery.data?.task as Task | undefined

  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <div className="container flex flex-1 flex-col">
        <div className="inline-block min-w-full py-2 align-middle">
          {taskQuery.isLoading ? (
            <div>Loading task details...</div>
          ) : taskQuery.isError ? (
            <div className="text-red-500">Failed to load task details</div>
          ) : taskData ? (
            <div className="space-y-4">
              <div className="flex justify-between">
                <div>
                  <h1 className="text-2xl font-semibold">
                    {taskData.taskIdentifier}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          getStatusColor(taskData),
                        )}
                      />
                      <span>{getStatusText(taskData)}</span>
                    </div>
                    <span className="px-1">•</span>
                    <span>Task ID: {taskData.id}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      void navigate(`/folders/${folderId}/tasks`)
                    }}
                  >
                    Back to Tasks
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Created At
                  </h3>
                  <p className="font-mono text-sm">
                    {new Date(taskData.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Updated At
                  </h3>
                  <p className="font-mono text-sm">
                    {new Date(taskData.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Owner
                  </h3>
                  <p className="font-mono text-sm">
                    {taskData.ownerIdentifier}
                  </p>
                </div>
                {taskData.subjectObjectKey && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Object Key
                    </h3>
                    <p className="font-mono text-sm">
                      {taskData.subjectObjectKey}
                    </p>
                  </div>
                )}
              </div>

              {taskData.errorAt && (
                <div className="rounded-lg border border-red-700/20 bg-red-950/10 p-4">
                  <h3 className="mb-2 text-sm font-medium text-red-400">
                    Error Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground">
                        Error Code
                      </h4>
                      <p className="font-mono text-sm text-red-400">
                        {taskData.errorCode || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground">
                        Error Time
                      </h4>
                      <p className="font-mono text-sm">
                        {taskData.errorAt &&
                          new Date(taskData.errorAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {taskData.errorMessage && (
                    <div className="mt-2">
                      <h4 className="text-xs font-medium text-muted-foreground">
                        Error Message
                      </h4>
                      <p className="font-mono text-sm text-red-400">
                        {taskData.errorMessage}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-lg border p-4">
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  Description
                </h3>
                <div className="rounded-md bg-foreground/5 p-4 font-mono text-sm">
                  <div className="font-medium">
                    {taskData.taskDescription.textKey}
                  </div>
                  {taskData.taskDescription.textHTML && (
                    <div
                      className="mt-2"
                      dangerouslySetInnerHTML={{
                        __html: taskData.taskDescription.textHTML,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>Task not found</div>
          )}
        </div>
      </div>
    </div>
  )
}
