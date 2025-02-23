import type { NextPage } from 'next'
import React from 'react'

import { ListChecks } from 'lucide-react'
import { ContentLayout } from '../../../../components/sidebar/components/content-layout'
import { FolderTasksScreen } from '../../../../views/folder-tasks-screen/folder-tasks-screen.view'
import {
  FolderContextProvider,
  useFolderContext,
} from '../../../../contexts/folder.context'
import { useRouter } from 'next/router'

const FolderTasksPageInner = () => {
  const folderContext = useFolderContext()

  return (
    <ContentLayout
      titleIcon={ListChecks}
      description={'All tasks for this folder'}
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
  return (
    <FolderContextProvider folderId={router.query.folderId as string}>
      <FolderTasksPageInner />
    </FolderContextProvider>
  )
}

export default FolderTasksPage
