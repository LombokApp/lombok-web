import type { NextPage } from 'next'
import React from 'react'

import { ContentLayout } from '../../components/sidebar/components/content-layout'
import { UserAccessKeysScreen } from '../../views/user-access-keys-screen/user-access-keys-screen'

const AccessKeys: NextPage = () => {
  return (
    <ContentLayout breadcrumbs={[{ label: 'Access Keys' }]}>
      <UserAccessKeysScreen />
    </ContentLayout>
  )
}

export default AccessKeys
