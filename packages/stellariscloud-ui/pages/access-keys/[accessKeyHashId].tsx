import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import React from 'react'
import { KeyRound } from 'lucide-react'
import { UserAccessKeyDetailScreen } from '../../views/user-access-key-detail-screen/user-access-key-detail-screen.view'
import { ContentLayout } from '../../components/sidebar/components/content-layout'
import { useRouter } from 'next/router'

const UserAccessKeyDetailPage: NextPage = () => {
  const authContext = useAuthContext()
  const router = useRouter()
  return (
    <ContentLayout
      titleIcon={KeyRound}
      breadcrumbs={[
        { label: 'Access Keys', href: '/access-keys' },
        { label: `Key ID: ${router.query.accessKeyHashId}` },
      ]}
      description={
        'Manage and review access keys used by your current and recent folders'
      }
    >
      {authContext.authState.isAuthenticated && <UserAccessKeyDetailScreen />}
    </ContentLayout>
  )
}

export default UserAccessKeyDetailPage
