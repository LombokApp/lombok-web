import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'
import { AppWindow } from 'lucide-react'

import { ServerAppDetailScreen } from '../../../views/server/apps/server-app-detail-screen/server-app-detail-screen.view'
import { ContentLayout } from '../../../components/sidebar/components/content-layout'

const ServerAppPage: NextPage = () => {
  const router = useRouter()
  return (
    <ContentLayout
      titleIcon={AppWindow}
      breadcrumbs={[
        { label: 'Server', href: '/server/dashboard' },
        { label: 'Installed Apps' },
      ]}
      description="All installed apps on the server"
    >
      <ServerAppDetailScreen />
    </ContentLayout>
  )
}

export default ServerAppPage
