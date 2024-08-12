import type { EventDTO } from '@stellariscloud/api-client'
import { useRouter } from 'next/router'
import React from 'react'

import { apiClient } from '../../../../services/api'
import { timeSinceOrUntil } from '@stellariscloud/utils'
import { StackedList } from '../../../../design-system/stacked-list/stacked-list'
import { PageHeading } from '../../../../design-system/page-heading/page-heading'
import clsx from 'clsx'
import { ChevronRightIcon, SignalIcon } from '@heroicons/react/24/outline'
import { Button } from '../../../../design-system/button/button'
import Link from 'next/link'
import { EmptyState } from '../../../../design-system/empty-state/empty-state'

export function ServerEventsScreen() {
  const router = useRouter()
  const [events, setEvents] = React.useState<EventDTO[]>()
  React.useEffect(() => {
    void apiClient.serverEventsApi
      .listEvents()
      .then((response) => setEvents(response.data.result))
  }, [])
  return (
    <div
      className={clsx(
        'p-4 items-center flex flex-1 flex-col h-full overflow-x-hidden overflow-y-auto',
      )}
    >
      <div className="container flex-1 flex flex-col">
        <PageHeading
          titleIcon={SignalIcon}
          title={'Events'}
          subtitle="Review all events across the server."
        />
        {events?.length === 0 && (
          <div>
            <EmptyState icon={SignalIcon} text="There are no events. Weird." />
          </div>
        )}
        {events && (
          <StackedList
            className=""
            items={events.map((event, i) => (
              <Link
                href={`/server/events/${event.id}`}
                className="w-full flex-1 p-2"
              >
                <div className="flex justify-between flex-1 items-center gap-x-4">
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex flex-col pl-4">
                      <div className="text-xs">
                        ID: {event.id.slice(0, 8)} -{' '}
                        <span className="uppercase opacity-80">
                          {event.appIdentifier}
                        </span>
                      </div>
                      <div>{event.eventKey}</div>
                      <div className="flex flex-col">
                        <div className="text-xs">
                          {new Date(event.createdAt).toLocaleString()} -{' '}
                          {timeSinceOrUntil(new Date(event.createdAt))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex flex-col">
                      <div>
                        Folder: {event.locationContext?.folderId.slice(0, 8)}
                      </div>
                      <div>Object: {event.locationContext?.objectKey}</div>
                    </div>
                  </div>
                  <div>
                    <div className="flex flex-col">
                      <pre className="p-2 rounded-md bg-black/20 text-xs max-h-[4rem] overflow-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <Button link icon={ChevronRightIcon} />
                  </div>
                </div>
              </Link>
            ))}
          />
        )}
      </div>
    </div>
  )
}
