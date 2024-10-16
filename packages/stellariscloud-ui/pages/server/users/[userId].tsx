import { User } from 'lucide-react'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { ServerUserDetailScreen } from '../../../views/server/users/server-user-detail-screen/server-user-detail-screen.view'
import { ContentLayout } from '../../../components/sidebar/components/content-layout'

const ServerUserPage: NextPage = () => {
  const router = useRouter()
  return (
    <div className="h-full w-full">
      <ContentLayout
        titleIcon={User}
        breadcrumbs={[
          { label: 'Server', href: '/server/dashboard' },
          { label: 'All Users', href: '/server/users' },
          { label: `User: ${router.query.userId}` },
        ]}
      >
        <ServerUserDetailScreen />
      </ContentLayout>
    </div>
  )
}

export default ServerUserPage
