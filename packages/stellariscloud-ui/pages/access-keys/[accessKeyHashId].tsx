import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import React from 'react'
import { UserAccessKeyDetailScreen } from '../../views/user-access-key-detail-screen/user-access-key-detail-screen.view'
import { ContentLayout } from '../../components/sidebar/components/content-layout'
import { useRouter } from 'next/router'

const UserAccessKeyDetailPage: NextPage = () => {
  const authContext = useAuthContext()
  const router = useRouter()
  return (
    <ContentLayout
      breadcrumbs={[
        { label: 'Access Keys', href: '/access-keys' },
        { label: `Key ID: ${router.query.accessKeyHashId}` },
      ]}
    >
      {authContext.authState.isAuthenticated && <UserAccessKeyDetailScreen />}
    </ContentLayout>
  )
}

export default UserAccessKeyDetailPage
