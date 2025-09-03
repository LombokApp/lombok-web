import type { EventDTO, FolderGetResponse } from '@lombokapp/types'
import { FolderPushMessage, PLATFORM_IDENTIFIER } from '@lombokapp/types'
import {
  Card,
  CardContent,
  CardHeader,
  Skeleton,
  TypographyH3,
} from '@lombokapp/ui-toolkit'
import { ActivityIcon } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router'

import { DateDisplay } from '@/src/components/date-display'
import { useFolderContext } from '@/src/contexts/folder'
import { $api } from '@/src/services/api'

const EVENT_PREVIEW_LENGTH = 5

// Custom event card component with link
const EventCard = ({
  event,
  folderId,
}: {
  event: EventDTO
  folderId: string
}) => {
  return (
    <Link
      to={`/folders/${folderId}/events/${event.id}`}
      className="block transition-colors hover:no-underline"
    >
      <div className="group rounded-md border border-foreground/5 bg-foreground/[.03] p-3 text-sm font-medium transition-all duration-200 hover:border-foreground/10 hover:bg-foreground/[.05]">
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="font-semibold group-hover:text-primary">
                {event.eventIdentifier}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <DateDisplay
                date={event.createdAt}
                showTimeSince={false}
                className="text-xs"
                dateOptions={{
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }}
              />
            </div>
          </div>
          <div className="mt-1 flex gap-1 text-xs text-muted-foreground">
            <div>Source:</div>
            <div className="font-mono">
              {event.emitterIdentifier === PLATFORM_IDENTIFIER
                ? PLATFORM_IDENTIFIER
                : `app:${event.emitterIdentifier[0]}`}
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
              <ActivityIcon className="size-6" />
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
