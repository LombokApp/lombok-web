import type { EventDTO } from '@stellariscloud/types'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from '@stellariscloud/ui-toolkit'

import { DateDisplay } from '@/src/components/date-display'

interface EventDetailUIProps {
  eventData: EventDTO | undefined
  isLoading: boolean
  isError: boolean
}

export function EventDetailUI({
  eventData,
  isLoading,
  isError,
}: EventDetailUIProps) {
  // Get the appropriate color for the level indicator
  const getLevelColor = (level?: string) => {
    if (!level) {
      return 'bg-slate-500'
    }

    switch (level) {
      case 'INFO':
        return 'bg-blue-500'
      case 'ERROR':
        return 'bg-red-500'
      case 'WARN':
        return 'bg-amber-500'
      case 'DEBUG':
        return 'bg-neutral-500'
      case 'TRACE':
        return 'bg-slate-500'
      default:
        return 'bg-slate-500'
    }
  }

  // Get the badge variant for the level
  const getLevelBadgeVariant = (level?: string) => {
    if (!level) {
      return 'secondary' as const
    }

    switch (level) {
      case 'INFO':
        return 'default' as const
      case 'ERROR':
        return 'destructive' as const
      case 'WARN':
        return 'outline' as const
      case 'DEBUG':
        return 'secondary' as const
      case 'TRACE':
        return 'secondary' as const
      default:
        return 'secondary' as const
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading event details...</p>
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
              Failed to load event details
            </h3>
            <p className="text-muted-foreground">Please try again later</p>
          </div>
        </div>
      </div>
    )
  }

  if (!eventData) {
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
            <h3 className="text-lg font-semibold">Event not found</h3>
            <p className="text-muted-foreground">
              The requested event could not be found
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <div className="container flex flex-1 flex-col">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {eventData.eventKey}
                </h1>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      getLevelColor(eventData.level),
                    )}
                  />
                  <Badge variant={getLevelBadgeVariant(eventData.level)}>
                    {eventData.level}
                  </Badge>
                </div>
                <span>•</span>
                <span className="font-mono">ID: {eventData.id}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Event Information Card */}
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Event Information
              </CardTitle>
              <CardDescription>Basic details about this event</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Created At
                    </label>
                    <p className="mt-1 font-mono text-sm">
                      <DateDisplay
                        date={eventData.createdAt}
                        showTimeSince={false}
                      />
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Emitted By
                    </label>
                    <p className="mt-1 font-mono text-sm">
                      {eventData.emitterIdentifier}
                    </p>
                  </div>
                  {eventData.locationContext?.objectKey && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Object Key
                      </label>
                      <p className="mt-1 break-all font-mono text-sm">
                        {eventData.locationContext.objectKey}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Data Card */}
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
                Event Data
              </CardTitle>
              <CardDescription>Event payload and metadata</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-muted/50 p-4">
                <pre className="max-h-96 overflow-auto font-mono text-sm">
                  {JSON.stringify(eventData.data, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
