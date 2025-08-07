import { configureTasksTableColumns } from '@/src/components/tasks-table-columns/tasks-table-columns'

export const serverTasksTableColumns = configureTasksTableColumns({
  getLinkTo: (task) => `/server/tasks/${task.id}`,
  taskIdentifierTitle: 'Task',
  showOwnerSubtext: true,
  folderObjectColumnTitle: 'Folder / Object',
  showFolderInFolderObjectColumn: true,
})
