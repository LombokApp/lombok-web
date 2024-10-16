import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'
import { AppWindow } from 'lucide-react'

import { ServerAppsScreen } from '../../../views/server/apps/server-apps-screen/server-apps-screen.view'
import { ContentLayout } from '../../../components/sidebar/components/content-layout'

const ServerAppsPage: NextPage = () => {
  const router = useRouter()
  return (
    <div className="h-full w-full">
      <ContentLayout
        titleIcon={AppWindow}
        breadcrumbs={[
          { label: 'Server', href: '/server/dashboard' },
          { label: 'Installed Apps' },
        ]}
        description="All installed apps on the server"
      >
        <ServerAppsScreen />
      </ContentLayout>
    </div>
  )
}

export default ServerAppsPage
