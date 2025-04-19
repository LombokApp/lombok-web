import { Button, cn } from '@stellariscloud/ui-toolkit'
import { useParams } from 'react-router-dom'

import { useFolderContext } from '../../pages/folders/folder.context'
import { serverEventsApiHooks } from '../../services/api'

export function FolderEventDetailScreen() {
  const params = useParams()
  const eventId = (params['*']?.split('/') ?? [])[2]
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { folderId } = useFolderContext()

  const eventQuery = serverEventsApiHooks.useGetEvent(
    { eventId },
    { enabled: !!eventId },
  )

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

  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <div className="container flex flex-1 flex-col">
        <div className="inline-block min-w-full py-2 align-middle">
          {eventQuery.isLoading ? (
            <div>Loading event details...</div>
          ) : eventQuery.data?.event ? (
            <div className="space-y-4">
              <div className="flex justify-between">
                <div>
                  <h1 className="text-2xl font-semibold">
                    {eventQuery.data.event.eventKey}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={cn(
                          'size-2 rounded-full',
                          getLevelColor(eventQuery.data.event.level),
                        )}
                      />
                      <span>{eventQuery.data.event.level}</span>
                    </div>
                    <span className="px-1">•</span>
                    <span>Event ID: {eventQuery.data.event.id}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Back to Events</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Created At
                  </h3>
                  <p className="font-mono text-sm">
                    {new Date(eventQuery.data.event.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Emitter
                  </h3>
                  <p className="font-mono text-sm">
                    {eventQuery.data.event.emitterIdentifier}
                  </p>
                </div>
                {eventQuery.data.event.locationContext?.objectKey && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Object Key
                    </h3>
                    <p className="font-mono text-sm">
                      {eventQuery.data.event.locationContext.objectKey}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  Event Data
                </h3>
                <pre className="max-h-96 overflow-auto rounded-md bg-foreground/5 p-4 font-mono text-sm">
                  {JSON.stringify(eventQuery.data.event.data, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div>Event not found</div>
          )}
        </div>
      </div>
    </div>
  )
}
