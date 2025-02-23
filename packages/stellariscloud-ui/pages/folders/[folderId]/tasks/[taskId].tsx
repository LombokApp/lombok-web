import type { NextPage } from 'next'
import React from 'react'

import { ListChecks } from 'lucide-react'
import { ContentLayout } from '../../../../components/sidebar/components/content-layout'
import {
  FolderContextProvider,
  useFolderContext,
} from '../../../../contexts/folder.context'
import { useRouter } from 'next/router'
import { FolderTaskDetailScreen } from '../../../../views/folder-task-detail-screen/folder-task-detail-screen.view'

const FolderTaskDetailPageInner = () => {
  const router = useRouter()
  const folderContext = useFolderContext()
  return (
    <ContentLayout
      titleIcon={ListChecks}
      description={`Task ID: ${router.query.taskId}`}
      breadcrumbs={[
        { label: 'Folders', href: `/folders` },
        {
          label: folderContext.folder?.name ?? 'Folder',
          href: `/folders/${router.query.folderId}`,
        },
        { label: 'Tasks', href: `/folders/${router.query.folderId}/tasks` },
        {
          label: `Task ${router.query.taskId}`,
        },
      ]}
    >
      <FolderTaskDetailScreen />
    </ContentLayout>
  )
}
const FolderTaskDetailPage: NextPage = () => {
  const router = useRouter()
  const folderContext = useFolderContext()
  console.log({ router })
  return (
    <FolderContextProvider folderId={router.query.folderId as string}>
      <FolderTaskDetailPageInner />
    </FolderContextProvider>
  )
}

export default FolderTaskDetailPage
