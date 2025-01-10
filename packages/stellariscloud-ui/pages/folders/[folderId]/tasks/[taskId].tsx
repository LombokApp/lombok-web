import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { ContentLayout } from '../../../../components/sidebar/components/content-layout'
import {
  FolderContextProvider,
  useFolderContext,
} from '../../../../contexts/folder.context'
import { FolderTaskDetailScreen } from '../../../../views/folder-task-detail-screen/folder-task-detail-screen.view'

const FolderTaskDetailPageInner = () => {
  const router = useRouter()
  const folderContext = useFolderContext()
  return (
    <ContentLayout
      breadcrumbs={[
        { label: 'Folders', href: `/folders` },
        {
          label: folderContext.folder?.name ?? 'Folder',
          href: `/folders/${router.query.folderId as string}`,
        },
        {
          label: 'Tasks',
          href: `/folders/${router.query.folderId as string}/tasks`,
        },
        {
          label: `Task ${router.query.taskId as string}`,
        },
      ]}
    >
      <FolderTaskDetailScreen />
    </ContentLayout>
  )
}
const FolderTaskDetailPage: NextPage = () => {
  const router = useRouter()
  return (
    <FolderContextProvider folderId={router.query.folderId as string}>
      <FolderTaskDetailPageInner />
    </FolderContextProvider>
  )
}

export default FolderTaskDetailPage
