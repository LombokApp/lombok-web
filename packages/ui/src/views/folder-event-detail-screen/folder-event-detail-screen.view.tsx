import { useParams } from 'react-router-dom'

import { EventDetailUI } from '@/src/components/event-detail-ui/event-detail-ui'
import { useFolderContext } from '@/src/pages/folders/folder.context'
import { $api } from '@/src/services/api'

export function FolderEventDetailScreen() {
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
    <div className="flex flex-1 flex-col items-center">
      <div className="container flex flex-1 flex-col overflow-y-scroll py-6">
        <div className="flex w-full flex-1 flex-col">
          <EventDetailUI
            eventData={eventQuery.data?.event}
            isLoading={eventQuery.isLoading}
            isError={eventQuery.isError}
          />
        </div>
      </div>
    </div>
  )
}
