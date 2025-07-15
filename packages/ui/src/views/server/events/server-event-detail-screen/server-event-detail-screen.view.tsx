import type { EventDTO } from '@stellariscloud/api-client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@stellariscloud/ui-toolkit'
import React from 'react'

import { ServerEventAttributesList } from '../../../../components/server-event-attributes-list/server-event-attributes-list'
import { apiClient } from '../../../../services/api'

export function ServerEventDetailScreen({ eventId }: { eventId: string }) {
  const [event, setEvent] = React.useState<EventDTO>()
  React.useEffect(() => {
    if (typeof eventId === 'string') {
      void apiClient.serverEventsApi
        .getEvent({ eventId })
        .then((u) => setEvent(u.data.event))
    }
  }, [eventId])

  return (
    <div className="flex size-full flex-1 flex-col gap-8 overflow-hidden overflow-y-auto">
      <div className="container flex flex-1 flex-col gap-4">
        <Card className="border-0 bg-transparent">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Event: {event?.id}</CardTitle>
            <CardDescription>Key: {event?.eventKey}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ServerEventAttributesList event={event} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
