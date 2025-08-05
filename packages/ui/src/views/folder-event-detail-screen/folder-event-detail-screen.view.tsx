import { useNavigate, useParams } from 'react-router-dom'

import { EventDetailUI } from '@/src/components/event-detail-ui/event-detail-ui'
import { useFolderContext } from '@/src/pages/folders/folder.context'
import { $api } from '@/src/services/api'

export function FolderEventDetailScreen() {
  const navigate = useNavigate()
  const params = useParams()
  const eventId = (params['*']?.split('/') ?? [])[2] ?? ''
  const { folderId } = useFolderContext()

  const eventQuery = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/events/{eventId}',
    {
      params: { path: { folderId, eventId } },
    },
    {
      enabled: !!eventId && !!folderId,
    },
  )

  return (
    <EventDetailUI
      eventData={eventQuery.data?.event}
      isLoading={eventQuery.isLoading}
      isError={eventQuery.isError}
      onBack={() => {
        void navigate(`/folders/${folderId}/events`)
      }}
    />
  )
}
