import { useParams } from 'react-router'

import { FolderContextProvider, useFolderContext } from '@/src/contexts/folder'

import { ContentLayout } from '../../components/sidebar/components/content-layout'
import { FolderDetailScreen } from '../../views/folder-detail-screen/folder-detail-screen.view'
import { FolderEventDetailScreen } from '../../views/folder-event-detail-screen/folder-event-detail-screen.view'
import { FolderEventsScreen } from '../../views/folder-events-screen/folder-events-screen.view'
import { FolderObjectDetailScreen } from '../../views/folder-object-detail-screen/folder-object-detail-screen.view'
import { FolderTaskDetailScreen } from '../../views/folder-task-detail-screen/folder-task-detail-screen.view'
import { FolderTasksScreen } from '../../views/folder-tasks-screen/folder-tasks-screen.view'
import { FocusedFolderObjectContextProvider } from './focused-folder-object.context'

function FolderObjectRootInner() {
  const params = useParams()
  const pathParts = params['*']?.split('/') ?? []
  const isFolderObjectDetailPage =
    pathParts.length > 2 && pathParts[1] === 'objects'
  const folderContext = useFolderContext()
  const focusedFolderObjectKey = isFolderObjectDetailPage
    ? pathParts.slice(2).join('/')
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
    ? pathParts.slice(2).join('/')
    : undefined

  const isTaskListPage = pathParts.length === 2 && pathParts[1] === 'tasks'
  const isTaskDetailPage = pathParts.length === 3 && pathParts[1] === 'tasks'

  const isEventListPage = pathParts.length === 2 && pathParts[1] === 'events'
  const isEventDetailPage = pathParts.length === 3 && pathParts[1] === 'events'

  const folderContext = useFolderContext()
  const extraBreadcrumbs: { label: string; href: string }[] = []
  if (focusedFolderObjectKey) {
    extraBreadcrumbs.push({
      label: focusedFolderObjectKey,
      href: pathParts[2] ?? '',
    })
  } else if (isEventDetailPage) {
    extraBreadcrumbs.push({
      label: 'Events',
      href: `/folders/${folderContext.folderId}/events`,
    })
    extraBreadcrumbs.push({
      label: pathParts[2] ?? '',
      href: pathParts[2] ?? '',
    })
  } else if (isTaskListPage) {
    extraBreadcrumbs.push({
      label: 'Tasks',
      href: '',
    })
  } else if (isEventListPage) {
    extraBreadcrumbs.push({
      label: 'Events',
      href: '',
    })
  } else if (isTaskDetailPage) {
    extraBreadcrumbs.push({
      label: 'Tasks',
      href: `/folders/${folderContext.folderId}/tasks`,
    })
    extraBreadcrumbs.push({
      label: pathParts[2] ?? '',
      href: pathParts[2] ?? '',
    })
  }
  return (
    <ContentLayout
      contentPadding={true}
      breadcrumbs={[
        { label: 'Folders', href: '/folders' },
        {
          label: folderContext.folder?.name ?? folderContext.folderId,
          href: isFolderDetailPage ? '' : `/folders/${folderContext.folderId}`,
        },
      ].concat(extraBreadcrumbs)}
    >
      <div className="flex size-full">
        {focusedFolderObjectKey ? (
          <FolderObjectRootInner />
        ) : isFolderDetailPage ? (
          <FolderDetailScreen />
        ) : isTaskListPage ? (
          <FolderTasksScreen />
        ) : isTaskDetailPage ? (
          <FolderTaskDetailScreen />
        ) : isEventListPage ? (
          <FolderEventsScreen />
        ) : isEventDetailPage ? (
          <FolderEventDetailScreen />
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
