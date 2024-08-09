import type { EventDTO, UserDTO } from '@stellariscloud/api-client'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { apiClient } from '../../../services/api'
import { ServerEventDetailScreen } from '../../../views/server/server-event-detail-screen/server-event-detail-screen.view'

const ServerEventPage: NextPage = () => {
  const router = useRouter()
  const [event, setEvent] = React.useState<EventDTO>()
  React.useEffect(() => {
    if (router.query.eventId) {
      void apiClient.eventsApi.getEvent({}).then((u) => setEvent(u.data.event))
    }
  }, [router.query.eventId])

  return (
    <div className="h-full w-full">
      {event && <ServerEventDetailScreen event={event} />}
    </div>
  )
}

export default ServerEventPage
