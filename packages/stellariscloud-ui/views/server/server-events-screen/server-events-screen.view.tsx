import type { EventDTO } from '@stellariscloud/api-client'
import { useRouter } from 'next/router'
import React from 'react'

import { Avatar } from '../../../design-system/avatar'
import { Button } from '../../../design-system/button/button'
import { Table } from '../../../design-system/table/table'
import { apiClient } from '../../../services/api'

export function ServerEventsScreen() {
  const router = useRouter()
  const [events, setEvents] = React.useState<EventDTO[]>()
  React.useEffect(() => {
    void apiClient.eventsApi
      .listEvents()
      .then((response) => setEvents(response.data.result))
  }, [])
  return (
    <div className="">
      {events && (
        <div className="flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <Table
                headers={['Event ID', 'Event Key', 'Data']}
                rows={events.map((event, i) => [
                  <div key={i} className="flex items-center gap-4">
                    <Avatar
                      uniqueKey={event.id}
                      size="sm"
                      className="bg-indigo-100"
                    />
                    <div className="flex flex-col">
                      <div>{event.id}</div>
                    </div>
                  </div>,
                  <div>
                    <div className="flex flex-col">
                      <div>{event.eventKey}</div>
                    </div>
                  </div>,
                  <div>
                    <div className="flex flex-col">
                      <div>Folder: {event.data.folderId}</div>
                      <div>Object: {event.data.objectKey}</div>
                    </div>
                  </div>,
                ])}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
