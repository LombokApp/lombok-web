import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import React from 'react'
import { ServerEventsScreen } from '../../../views/server/events/server-events-screen/server-events-screen.view'
import { ContentLayout } from '../../../components/sidebar/components/content-layout'
import { ChartArea } from 'lucide-react'

const ServerEventsPage: NextPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="h-full w-full">
      {authContext.authState.isAuthenticated && authContext.viewer?.isAdmin && (
        <ContentLayout
          titleIcon={ChartArea}
          breadcrumbs={[
            { label: 'Server', href: '/server/dashboard' },
            { label: 'Events' },
          ]}
          description="All emitted events during the operation of this server"
        >
          <ServerEventsScreen />
        </ContentLayout>
      )}
    </div>
  )
}

export default ServerEventsPage
