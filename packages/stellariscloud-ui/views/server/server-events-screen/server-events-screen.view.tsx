import type { EventDTO } from '@stellariscloud/api-client'
import { useRouter } from 'next/router'
import React from 'react'

import { apiClient } from '../../../services/api'
import { timeSinceOrUntil } from '@stellariscloud/utils'
import { StackedList } from '../../../design-system/stacked-list/stacked-list'
import { PageHeading } from '../../../design-system/page-heading/page-heading'
import clsx from 'clsx'

export function ServerEventsScreen() {
  const router = useRouter()
  const [events, setEvents] = React.useState<EventDTO[]>()
  React.useEffect(() => {
    void apiClient.eventsApi
      .listEvents()
      .then((response) => setEvents(response.data.result))
  }, [])
  return (
    <div
      className={clsx(
        'p-4 items-center flex flex-1 flex-col gap-6 h-full overflow-x-auto w-full overflow-y-hidden',
      )}
    >
      <PageHeading title={'Server Events'} />
      {events && (
        <StackedList
          items={events.map((event, i) => (
            <>
              <div key={i} className="flex items-center gap-4">
                <div className="flex flex-col pl-4">
                  <div className="text-xs">{event.id.slice(0, 8)}</div>
                  <div>{event.eventKey}</div>
                </div>
              </div>
              <div>
                <div className="flex flex-col">
                  <div>{event.appIdentifier}</div>
                </div>
              </div>
              <div>
                <div className="flex flex-col">
                  <div>{event.locationContext?.folderId.slice(0, 8)}</div>
                </div>
              </div>
              <div>
                <div className="flex flex-col">
                  <div>{event.locationContext?.objectKey}</div>
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
                <div className="flex flex-col">
                  <div>{timeSinceOrUntil(new Date(event.createdAt))}</div>
                  <div className="text-xs">
                    {new Date(event.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </>
          ))}
        />
      )}
    </div>
  )
}
