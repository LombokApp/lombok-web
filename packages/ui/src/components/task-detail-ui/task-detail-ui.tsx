import { useAuthContext } from '@lombokapp/auth-utils'
import type { TaskDTO } from '@lombokapp/types'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from '@lombokapp/ui-toolkit'
import { Link } from 'react-router-dom'

import { DateDisplay } from '@/src/components/date-display'

interface TaskDetailUIProps {
  taskData: TaskDTO | undefined
  isLoading: boolean
  isError: boolean
}

export function TaskDetailUI({
  taskData,
  isLoading,
  isError,
}: TaskDetailUIProps) {
  const authContext = useAuthContext()
  const currentUserId = authContext.viewer?.id

  // Get the appropriate color for the status indicator
  const getStatusColor = (task?: TaskDTO) => {
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

  // Get the status text and badge variant
  const getStatusInfo = (task?: TaskDTO) => {
    if (!task) {
      return { text: 'Unknown', variant: 'secondary' as const }
    }

    if (task.completedAt) {
      return { text: 'Complete', variant: 'default' as const }
    } else if (task.errorAt) {
      return { text: 'Failed', variant: 'destructive' as const }
    } else if (!task.startedAt) {
      return { text: 'Pending', variant: 'secondary' as const }
    } else {
      return { text: 'Running', variant: 'outline' as const }
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading task details...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-full bg-destructive/10 p-3">
            <svg
              className="size-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive">
              Failed to load task details
            </h3>
            <p className="text-muted-foreground">Please try again later</p>
          </div>
        </div>
      </div>
    )
  }

  if (!taskData) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-full bg-muted p-3">
            <svg
              className="size-6 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33"
              />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Task not found</h3>
            <p className="text-muted-foreground">
              The requested task could not be found
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Check if the current user owns the folder
  const isFolderOwner =
    currentUserId &&
    taskData.subjectContext?.folderOwnerId &&
    currentUserId === taskData.subjectContext.folderOwnerId

  const statusInfo = getStatusInfo(taskData)
  const errorDetails = taskData.errorDetails
    ? (taskData.errorDetails as Record<string, string | number>)
    : {}
  const errorToDisplay = taskData.errorAt
    ? {
        stacktrace:
          (taskData.errorCode === 'WORKER_SCRIPT_RUNTIME_ERROR' &&
            errorDetails.stack) ??
          '',
        message:
          taskData.errorCode === 'WORKER_SCRIPT_RUNTIME_ERROR' &&
          errorDetails.message
            ? errorDetails.errorMessage
            : taskData.errorMessage,
        code:
          taskData.errorCode === 'WORKER_SCRIPT_RUNTIME_ERROR' &&
          errorDetails.name
            ? errorDetails.name
            : taskData.errorCode,
      }
    : {}

  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <div className="container flex flex-1 flex-col">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {taskData.taskIdentifier}
                </h1>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      getStatusColor(taskData),
                    )}
                  />
                  <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>
                </div>
                <span>•</span>
                <span className="font-mono">ID: {taskData.id}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Task Information and Timeline Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Task Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Task Information
                </CardTitle>
                <CardDescription>Basic details about this task</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Description
                    </label>
                    <p className="mt-1 rounded-md bg-muted/50 p-3 font-mono text-sm">
                      {taskData.taskDescription}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Handler
                      </label>
                      <p className="mt-1 font-mono text-sm">
                        {taskData.handlerId}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Owner
                      </label>
                      <p className="mt-1 font-mono text-sm">
                        {taskData.ownerIdentifier}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Created
                      </label>
                      <div className="mt-1 text-sm">
                        <DateDisplay
                          date={taskData.createdAt}
                          showTimeSince={true}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Updated
                      </label>
                      <div className="mt-1 text-sm">
                        <DateDisplay
                          date={taskData.updatedAt}
                          showTimeSince={true}
                        />
                      </div>
                    </div>
                  </div>
                  {taskData.subjectContext && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Folder / Object
                      </label>
                      <div className="mt-1 space-y-1">
                        {taskData.subjectContext.folderName &&
                          taskData.subjectContext.folderId && (
                            <p className="text-sm font-medium">
                              Folder:{' '}
                              {isFolderOwner ? (
                                <Link
                                  to={`/folders/${taskData.subjectContext.folderId}`}
                                  className="text-primary hover:underline"
                                >
                                  {taskData.subjectContext.folderName}
                                </Link>
                              ) : (
                                <span>
                                  {taskData.subjectContext.folderName}
                                </span>
                              )}
                            </p>
                          )}
                        {taskData.subjectContext.objectKey &&
                          taskData.subjectContext.folderId && (
                            <p className="text-sm text-muted-foreground">
                              Object:{' '}
                              {isFolderOwner ? (
                                <Link
                                  to={`/folders/${taskData.subjectContext.folderId}/objects/${taskData.subjectContext.objectKey}`}
                                  className="text-primary hover:underline"
                                >
                                  {taskData.subjectContext.objectKey}
                                </Link>
                              ) : (
                                <span>{taskData.subjectContext.objectKey}</span>
                              )}
                            </p>
                          )}
                        {!taskData.subjectContext.folderName &&
                          taskData.subjectContext.folderId && (
                            <p className="font-mono text-sm text-muted-foreground">
                              Folder ID: {taskData.subjectContext.folderId}
                            </p>
                          )}
                      </div>
                    </div>
                  )}
                  {taskData.subjectObjectKey && !taskData.subjectContext && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Object Key
                      </label>
                      <p className="mt-1 break-all font-mono text-sm">
                        {taskData.subjectObjectKey}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        From Event
                      </label>
                      <p className="mt-1 break-all font-mono text-sm">
                        {taskData.triggeringEventId}
                      </p>
                    </div>
                    {taskData.subjectFolderId && !taskData.subjectContext && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Subject Folder ID
                        </label>
                        <p className="mt-1 break-all font-mono text-sm">
                          {taskData.subjectFolderId}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Input Data
                    </label>
                    <div className="mt-1 rounded-md bg-muted/50 p-3">
                      <pre className="overflow-x-auto font-mono text-sm">
                        {JSON.stringify(taskData.inputData, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Timeline
                </CardTitle>
                <CardDescription>Task execution timeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <svg
                        className="size-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Task Created</p>
                      <div className="text-sm text-muted-foreground">
                        <DateDisplay
                          date={taskData.createdAt}
                          showTimeSince={false}
                        />
                      </div>
                    </div>
                  </div>

                  {taskData.startedAt && (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="flex size-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                          <svg
                            className="size-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Task Started</p>
                          <div className="text-sm text-muted-foreground">
                            <DateDisplay
                              date={taskData.startedAt}
                              showTimeSince={false}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {taskData.completedAt && (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="flex size-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                          <svg
                            className="size-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Task Completed</p>
                          <div className="text-sm text-muted-foreground">
                            <DateDisplay
                              date={taskData.completedAt}
                              showTimeSince={false}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {taskData.errorAt && (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="flex size-8 items-center justify-center rounded-full bg-red-100 text-red-600">
                          <svg
                            className="size-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Task Failed</p>
                          <div className="text-sm text-muted-foreground">
                            <DateDisplay
                              date={taskData.errorAt}
                              showTimeSince={false}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error Information Card */}
          {taskData.errorAt && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <svg
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  Error Information
                </CardTitle>
                <CardDescription className="text-destructive/70">
                  Details about the task failure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Error Code
                    </label>
                    <p className="mt-1 font-mono text-sm text-destructive">
                      {errorToDisplay.code ?? errorDetails.code ?? 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Error Time
                    </label>
                    <div className="mt-1 font-mono text-sm">
                      {taskData.errorAt && (
                        <DateDisplay
                          date={taskData.errorAt}
                          showTimeSince={false}
                        />
                      )}
                    </div>
                  </div>
                  {errorToDisplay.message && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Error Message
                      </label>
                      <p className="mt-1 rounded-md bg-destructive/10 p-3 font-mono text-sm text-destructive">
                        {errorToDisplay.message}
                      </p>
                    </div>
                  )}
                  {errorToDisplay.stacktrace && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Error Stacktrace
                      </label>
                      <span className="mt-1 rounded-md bg-destructive/10 p-3 font-mono text-sm text-destructive">
                        <pre>{errorToDisplay.stacktrace}</pre>
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
