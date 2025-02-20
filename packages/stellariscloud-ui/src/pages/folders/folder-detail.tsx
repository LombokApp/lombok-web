import { useParams } from 'react-router-dom'

import { ContentLayout } from '../../components/sidebar/components/content-layout'
import {
  FolderContextProvider,
  useFolderContext,
} from '../../contexts/folder.context'
import { FolderDetailScreen } from '../../views/folder-detail-screen/folder-detail-screen.view'

const FolderDetailInner = () => {
  const params = useParams()
  const folderContext = useFolderContext()
  return (
    <ContentLayout
      breadcrumbs={(
        [
          { label: 'Folders', href: '/folders' },
          {
            label: folderContext.folder?.name ?? 'Folder',
            href: params.objectKey
              ? `/folders/${folderContext.folder?.id}`
              : undefined,
          },
        ] as { href?: string; label: string }[]
      ).concat(
        params.objectKey
          ? [
              {
                label: params.objectKey,
              },
            ]
          : [],
      )}
    >
      <div className="flex size-full flex-1 flex-col gap-4">
        {params.folderId && <FolderDetailScreen />}
      </div>
    </ContentLayout>
  )
}

const FolderDetail = () => {
  const params = useParams()
  return params.folderId ? (
    <FolderContextProvider folderId={params.folderId}>
      <FolderDetailInner />
    </FolderContextProvider>
  ) : (
    <></>
  )
}

export default FolderDetail
