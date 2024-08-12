import type { EventDTO } from '@stellariscloud/api-client'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'

import { PageHeading } from '../../../../design-system/page-heading/page-heading'
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
          'p-4 items-center flex flex-1 flex-col h-full overflow-x-hidden overflow-y-auto',
        )}
      >
        <div className="container flex-1 flex flex-col">
          <PageHeading
            titleIconBg={'bg-amber-100'}
            avatarKey={event?.id}
            title={[`Server Event ID: ${event?.id}`]}
          />
          <ServerEventAttributesList event={event} />
        </div>
      </div>
    </>
  )
}
