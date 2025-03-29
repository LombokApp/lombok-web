import { useParams } from 'react-router-dom'

import { ContentLayout } from '../../components/sidebar/components/content-layout'
import { FolderDetailScreen } from '../../views/folder-detail-screen/folder-detail-screen.view'
import { useFolderContext } from './folder.context'

const FolderDetailInner = ({ paramParts }: { paramParts: string[] }) => {
  const folderId = paramParts[0]
  const objectKey = paramParts[1]
  const folderContext = useFolderContext()
  return (
    <ContentLayout
      breadcrumbs={(
        [
          { label: 'Folders', href: '/folders' },
          {
            label: folderContext.folder?.name ?? 'Folder',
            href: objectKey
              ? `/folders/${folderContext.folder?.id}`
              : undefined,
          },
        ] as { href?: string; label: string }[]
      ).concat(
        objectKey
          ? [
              {
                label: objectKey,
              },
            ]
          : [],
      )}
    >
      <div className="flex size-full flex-1 flex-col gap-4">
        {folderId && <FolderDetailScreen />}
      </div>
    </ContentLayout>
  )
}

export const FolderDetail = () => {
  const params = useParams()
  const paramParts = params['*']?.split('/') ?? []
  const folderId = paramParts[0]
  return folderId ? <FolderDetailInner paramParts={paramParts} /> : <></>
}
