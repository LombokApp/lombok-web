import { useNavigate } from 'react-router-dom'

import { EventDetailUI } from '@/src/components/event-detail-ui/event-detail-ui'
import { $api } from '@/src/services/api'

export function ServerEventDetailScreen({ eventId }: { eventId: string }) {
  const navigate = useNavigate()
  const eventQuery = $api.useQuery('get', '/api/v1/server/events/{eventId}', {
    params: { path: { eventId } },
  })

  return (
    <EventDetailUI
      eventData={eventQuery.data?.event}
      isLoading={eventQuery.isLoading}
      isError={eventQuery.isError}
      onBack={() => {
        void navigate('/server/events')
      }}
    />
  )
}
