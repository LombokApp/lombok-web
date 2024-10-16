import type { NextPage } from 'next'
import React from 'react'

import { UserAccessKeysScreen } from '../../views/user-access-keys-screen/user-access-keys-screen'
import { ContentLayout } from '../../components/sidebar/components/content-layout'
import { KeyRound } from 'lucide-react'

const AccessKeys: NextPage = () => {
  return (
    <ContentLayout
      titleIcon={KeyRound}
      breadcrumbs={[{ label: 'Access Keys' }]}
      description={
        'Manage and review access keys used by your current and recent folders'
      }
    >
      <UserAccessKeysScreen />
    </ContentLayout>
  )
}

export default AccessKeys
