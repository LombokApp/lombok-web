import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { ContentLayout } from '../../components/sidebar/components/content-layout'
import { UserAccessKeyDetailScreen } from '../../views/user-access-key-detail-screen/user-access-key-detail-screen.view'

const UserAccessKeyDetailPage: NextPage = () => {
  const authContext = useAuthContext()
  const router = useRouter()
  return (
    <ContentLayout
      breadcrumbs={[
        { label: 'Access Keys', href: '/access-keys' },
        { label: `Key ID: ${router.query.accessKeyHashId as string}` },
      ]}
    >
      {authContext.authState.isAuthenticated && <UserAccessKeyDetailScreen />}
    </ContentLayout>
  )
}

export default UserAccessKeyDetailPage
