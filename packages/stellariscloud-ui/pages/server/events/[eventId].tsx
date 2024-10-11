import type { NextPage } from 'next'
import React from 'react'
import { ChartArea } from 'lucide-react'

import { ServerEventDetailScreen } from '../../../views/server/events/server-event-detail-screen/server-event-detail-screen.view'
import { ContentLayout } from '../../../components/sidebar/components/content-layout'
import { useRouter } from 'next/router'

const ServerEventPage: NextPage = () => {
  const router = useRouter()
  return (
    <ContentLayout
      titleIcon={ChartArea}
      breadcrumbs={[
        { label: 'Server', href: '/server/dashboard' },
        { label: 'Events', href: '/server/events' },
        { label: `Event: ${router.query.eventId}` },
      ]}
    >
      {' '}
      <ServerEventDetailScreen />
    </ContentLayout>
  )
}

export default ServerEventPage
