import type { EventDTO, FolderGetResponse } from '@stellariscloud/types'
import { FolderPushMessage } from '@stellariscloud/types'
import {
  Card,
  CardContent,
  CardHeader,
  cn,
  Skeleton,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import { ActivityIcon } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

import { Icon } from '@/src/design-system/icon'
import { $api } from '@/src/services/api'

import { useFolderContext } from '../../pages/folders/folder.context'

const EVENT_PREVIEW_LENGTH = 5

// Custom event card component with link
const EventCard = ({
  event,
  folderId,
}: {
  event: EventDTO
  folderId: string
}) => {
  // Map event levels to color indicators
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'bg-red-500'
      case 'WARN':
        return 'bg-yellow-500'
      case 'INFO':
        return 'bg-blue-500'
      case 'DEBUG':
        return 'bg-gray-500'
      case 'TRACE':
        return 'bg-gray-400'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <Link
      to={`/folders/${folderId}/events/${event.id}`}
      className="block transition-colors hover:no-underline"
    >
      <div className="group rounded-md border border-foreground/5 bg-foreground/[.03] p-3 text-sm font-medium transition-all duration-200 hover:border-foreground/10 hover:bg-foreground/[.05]">
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'size-2.5 rounded-full',
                  getLevelColor(event.level),
                )}
              />
              <div className="font-semibold group-hover:text-primary">
                {event.eventKey}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(event.createdAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
          <div className="mt-1 flex gap-1 text-xs text-muted-foreground">
            <div>Source:</div>
            <div className="font-mono">
              {event.emitterIdentifier === 'core'
                ? 'core'
                : `app:${event.emitterIdentifier.split(':').at(-1)?.toLowerCase()}`}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export const FolderEventsList = ({
  folderAndPermission,
}: {
  folderAndPermission?: FolderGetResponse
}) => {
  const { folder } = folderAndPermission ?? {}
  const { folderId } = useFolderContext()
  const {
    data: listFolderEventsQuery,
    refetch,
    isLoading,
  } = $api.useQuery('get', '/api/v1/folders/{folderId}/events', {
    params: {
      path: {
        folderId,
      },
      query: {
        sort: 'createdAt-desc',
        limit: EVENT_PREVIEW_LENGTH,
      },
    },
  })

  const messageHandler = React.useCallback(
    (name: FolderPushMessage, _payload: unknown) => {
      if ([FolderPushMessage.EVENT_CREATED].includes(name)) {
        void refetch()
      }
    },
    [refetch],
  )

  useFolderContext(messageHandler)

  return (
    <Card className="h-auto">
      <CardHeader className="p-4 pb-1 pt-3">
        <div className="flex items-center justify-between">
          <TypographyH3>
            <div className="flex items-center gap-2">
              <Icon icon={ActivityIcon} size="md" className="text-primary" />
              Events
            </div>
          </TypographyH3>
          <Link
            className="text-xs font-medium text-primary hover:underline"
            to={`/folders/${folder?.id}/events`}
          >
            View all events
          </Link>
        </div>
      </CardHeader>
      <CardContent className="overflow-hidden p-4 pt-3">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : listFolderEventsQuery?.result &&
          listFolderEventsQuery.result.length > 0 ? (
          <div className="flex flex-col gap-3">
            {listFolderEventsQuery.result.map((event) => (
              <EventCard key={event.id} event={event} folderId={folderId} />
            ))}
            {listFolderEventsQuery.meta.totalCount > EVENT_PREVIEW_LENGTH && (
              <div className="text-center text-xs">
                <Link
                  to={`/folders/${folder?.id}/events`}
                  className="text-primary hover:underline"
                >
                  +{' '}
                  {listFolderEventsQuery.meta.totalCount - EVENT_PREVIEW_LENGTH}{' '}
                  more events
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="py-2 text-center text-sm text-muted-foreground">
            No events found for this folder
          </div>
        )}
      </CardContent>
    </Card>
  )
}
