import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { ContentLayout } from '../../../components/sidebar/components/content-layout'
import {
  FolderContextProvider,
  useFolderContext,
} from '../../../contexts/folder.context'
import { FolderDetailScreen } from '../../../views/folder-detail-screen/folder-detail-screen.view'

const FolderDetailInner = () => {
  const router = useRouter()
  const folderContext = useFolderContext()
  return (
    <ContentLayout
      breadcrumbs={(
        [
          { label: 'Folders', href: '/folders' },
          {
            label: folderContext.folder?.name ?? 'Folder',
            href: router.query.objectKey
              ? `/folders/${folderContext.folder?.id}`
              : undefined,
          },
        ] as { href?: string; label: string }[]
      ).concat(
        router.query.objectKey
          ? [
              {
                label: router.query.objectKey as string,
              },
            ]
          : [],
      )}
    >
      <div className="flex size-full flex-1 flex-col gap-4">
        {router.query.folderId && <FolderDetailScreen />}
      </div>
    </ContentLayout>
  )
}

const FolderDetail: NextPage = () => {
  const router = useRouter()
  return (
    <FolderContextProvider folderId={router.query.folderId as string}>
      <FolderDetailInner />
    </FolderContextProvider>
  )
}

export default FolderDetail
