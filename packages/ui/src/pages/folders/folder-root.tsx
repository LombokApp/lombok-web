import { useParams } from 'react-router-dom'

import { ContentLayout } from '../../components/sidebar/components/content-layout'
import { FolderDetailScreen } from '../../views/folder-detail-screen/folder-detail-screen.view'
import { FolderObjectDetailScreen } from '../../views/folder-object-detail-screen/folder-object-detail-screen.view'
import { FolderTaskDetailScreen } from '../../views/folder-task-detail-screen/folder-task-detail-screen.view'
import { FolderTasksScreen } from '../../views/folder-tasks-screen/folder-tasks-screen.view'
import { FocusedFolderObjectContextProvider } from './focused-folder-object.context'
import { FolderContextProvider, useFolderContext } from './folder.context'

function FolderObjectRootInner() {
  const params = useParams()
  const pathParts = params['*']?.split('/') ?? []
  const isFolderObjectDetailPage =
    pathParts.length > 2 && pathParts[1] === 'objects'
  const folderContext = useFolderContext()
  const focusedFolderObjectKey = isFolderObjectDetailPage
    ? pathParts[2]
    : undefined
  return focusedFolderObjectKey ? (
    <FocusedFolderObjectContextProvider
      folderId={folderContext.folderId}
      focusedFolderObjectKey={focusedFolderObjectKey}
    >
      {isFolderObjectDetailPage ? (
        <FolderObjectDetailScreen
          folderId={folderContext.folderId}
          objectKey={focusedFolderObjectKey}
        />
      ) : null}
    </FocusedFolderObjectContextProvider>
  ) : null
}

function FolderRootInner() {
  const params = useParams()
  const pathParts = params['*']?.split('/') ?? []
  const isFolderDetailPage = pathParts.length === 1
  const isFolderObjectDetailPage =
    pathParts.length > 2 && pathParts[1] === 'objects'
  const focusedFolderObjectKey = isFolderObjectDetailPage
    ? pathParts[2]
    : undefined

  const isTaskListPage = pathParts.length === 2 && pathParts[1] === 'tasks'
  const isTaskDetailPage = pathParts.length === 3 && pathParts[1] === 'tasks'
  const folderContext = useFolderContext()

  return (
    <ContentLayout
      contentPadding={false}
      breadcrumbs={[
        { label: 'Folders', href: '/folders' },
        {
          label: folderContext.folder?.name ?? folderContext.folderId,
          href: `/folders/${folderContext.folderId}`,
        },
      ].concat(
        focusedFolderObjectKey
          ? [
              {
                label: focusedFolderObjectKey,
                href: pathParts[2],
              },
            ]
          : [],
      )}
    >
      <div className="flex size-full p-2">
        {focusedFolderObjectKey ? (
          <FolderObjectRootInner />
        ) : isFolderDetailPage ? (
          <FolderDetailScreen />
        ) : isTaskListPage ? (
          <FolderTasksScreen />
        ) : isTaskDetailPage ? (
          <FolderTaskDetailScreen />
        ) : (
          <></>
        )}
      </div>
    </ContentLayout>
  )
}

export const FolderRoot = () => {
  const params = useParams()
  const paramParts = params['*']?.split('/') ?? []
  const folderId = paramParts[0]
  return folderId ? (
    <FolderContextProvider folderId={folderId}>
      <FolderRootInner />
    </FolderContextProvider>
  ) : (
    <></>
  )
}
