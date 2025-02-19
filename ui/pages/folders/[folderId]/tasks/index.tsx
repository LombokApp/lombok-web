import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { ContentLayout } from '../../../../components/sidebar/components/content-layout'
import {
  FolderContextProvider,
  useFolderContext,
} from '../../../../contexts/folder.context'
import { FolderTasksScreen } from '../../../../views/folder-tasks-screen/folder-tasks-screen.view'

const FolderTasksPageInner = () => {
  const folderContext = useFolderContext()

  return (
    <ContentLayout
      breadcrumbs={[
        { label: 'Folders', href: `/folders` },
        {
          label: folderContext.folder?.name ?? 'Folder',
          href: `/folders/${folderContext.folderId}`,
        },
        { label: 'Tasks' },
      ]}
    >
      <FolderTasksScreen />
    </ContentLayout>
  )
}

const FolderTasksPage: NextPage = () => {
  const router = useRouter()
  const authContext = useAuthContext()
  return (
    <FolderContextProvider folderId={router.query.folderId as string}>
      <FolderTasksPageInner />
    </FolderContextProvider>
  )
}

export default FolderTasksPage
