import { Users } from 'lucide-react'
import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import React from 'react'
import { ServerUsersScreen } from '../../../views/server/users/server-users-screen/server-users-screen.view'
import { ContentLayout } from '../../../components/sidebar/components/content-layout'

const ServerUsersPage: NextPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="h-full w-full">
      {authContext.authState.isAuthenticated && authContext.viewer?.isAdmin && (
        <ContentLayout
          titleIcon={Users}
          description="All users on the server"
          breadcrumbs={[
            { label: 'Server', href: '/server/dashboard' },
            { label: 'All Users' },
          ]}
        >
          <ServerUsersScreen />
        </ContentLayout>
      )}
    </div>
  )
}

export default ServerUsersPage
