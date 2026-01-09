import { configureTasksTableColumns } from '@/src/components/tasks-table-columns/tasks-table-columns'

export const folderTasksTableColumns = configureTasksTableColumns({
  getLinkTo: (task) =>
    task.targetLocation
      ? `/folders/${task.targetLocation.folderId}/tasks/${task.id}`
      : '',
  taskIdentifierTitle: 'Task',
  showOwnerSubtext: true,
  folderObjectColumnTitle: 'Object',
  showFolderInFolderObjectColumn: false,
})
