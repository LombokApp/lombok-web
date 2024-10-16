import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import React from 'react'
import { ServerDashboard } from '../../views/server/overview/server-dashboard-screen/server-dashboard-screen.view'
import { ContentLayout } from '../../components/sidebar/components/content-layout'
import { LayoutGrid } from 'lucide-react'

const ServerOverviewPage: NextPage = () => {
  const authContext = useAuthContext()
  return (
    authContext.authState.isAuthenticated &&
    authContext.viewer?.isAdmin && (
      <ContentLayout
        titleIcon={LayoutGrid}
        breadcrumbs={[{ label: 'Server' }, { label: 'Dashboard' }]}
        description="An overview of the server"
      >
        <ServerDashboard />
      </ContentLayout>
    )
  )
}

export default ServerOverviewPage
