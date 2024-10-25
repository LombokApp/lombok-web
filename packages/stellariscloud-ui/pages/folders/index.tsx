import type { NextPage } from 'next'
import React from 'react'

import { FoldersScreen } from '../../views/folders-screen/folders-screen.view'
import { ContentLayout } from '../../components/sidebar/components/content-layout'

const FoldersPage: NextPage = () => {
  return (
    <ContentLayout breadcrumbs={[{ label: 'Folders' }]}>
      <FoldersScreen />
    </ContentLayout>
  )
}

export default FoldersPage
