import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@stellariscloud/ui-toolkit'

import { ServerEventAttributesList } from '@/src/components/server-event-attributes-list/server-event-attributes-list'
import { $api } from '@/src/services/api'

export function ServerEventDetailScreen({ eventId }: { eventId: string }) {
  const { data } = $api.useQuery('get', '/api/v1/server/events/{eventId}', {
    params: { path: { eventId } },
  })

  return (
    <div className="flex size-full flex-1 flex-col gap-8 overflow-hidden overflow-y-auto">
      <div className="container flex flex-1 flex-col gap-4">
        <Card className="border-0 bg-transparent">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Event: {data?.event.id}</CardTitle>
            <CardDescription>Key: {data?.event.eventKey}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ServerEventAttributesList event={data?.event} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
