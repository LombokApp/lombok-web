import type { NextPage } from 'next'
import React from 'react'

import { FoldersScreen } from '../../views/folders-screen/folders-screen.view'
import { ContentLayout } from '../../components/sidebar/components/content-layout'
import { Folders } from 'lucide-react'

const FoldersPage: NextPage = () => {
  return (
    <ContentLayout
      titleIcon={Folders}
      description={'All folders to which you have access'}
      breadcrumbs={[{ label: 'Folders' }]}
    >
      <FoldersScreen />
    </ContentLayout>
  )
}

export default FoldersPage
