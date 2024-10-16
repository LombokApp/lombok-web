import type { EventDTO } from '@stellariscloud/api-client'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'

import { apiClient } from '../../../../services/api'
import { ServerEventAttributesList } from '../../../../components/server-event-attributes-list/server-event-attributes-list'

export function ServerEventDetailScreen() {
  const router = useRouter()
  const [event, setEvent] = React.useState<EventDTO>()
  React.useEffect(() => {
    if (typeof router.query.eventId === 'string') {
      void apiClient.serverEventsApi
        .getEvent({ eventId: router.query.eventId })
        .then((u) => setEvent(u.data.event))
    }
  }, [router.query.eventId])

  return (
    <>
      <div
        className={clsx(
          'items-center flex flex-1 flex-col gap-6 h-full overflow-y-auto',
        )}
      >
        <div className="container flex-1 flex flex-col gap-4 p-8">
          <ServerEventAttributesList event={event} />
        </div>
      </div>
    </>
  )
}
