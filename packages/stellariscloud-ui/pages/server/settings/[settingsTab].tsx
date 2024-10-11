import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import React from 'react'
import { ServerSettingsScreen } from '../../../views/server/settings/server-settings-screen/server-settings-screen'
import { ContentLayout } from '../../../components/sidebar/components/content-layout'
import { Settings } from 'lucide-react'

const ServerSettingsPage: NextPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="h-full w-full">
      {authContext.authState.isAuthenticated && authContext.viewer?.isAdmin && (
        <ContentLayout
          titleIcon={Settings}
          breadcrumbs={[
            { label: 'Server', href: '/server/dashboard' },
            { label: 'Settings' },
          ]}
          description="Change how this server behaves"
        >
          <ServerSettingsScreen />
        </ContentLayout>
      )}
    </div>
  )
}

export default ServerSettingsPage
