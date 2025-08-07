import { configureEventsTableColumns } from '@/src/components/events-table-columns/events-table-columns'

export const serverEventsTableColumns = configureEventsTableColumns({
  getLinkTo: (event) => `/server/events/${event.id}`,
  eventKeyTitle: 'Event Key',
  showActorSubtext: true,
  folderObjectColumnTitle: 'Folder / Object',
  showFolderInFolderObjectColumn: true,
})
