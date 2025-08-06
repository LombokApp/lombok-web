import { configureEventsTableColumns } from '@/src/components/events-table-columns/events-table-columns'

export const folderEventsTableColumns = configureEventsTableColumns({
  getLinkTo: (event) =>
    `/folders/${event.subjectContext?.folderId}/events/${event.id}`,
  eventKeyTitle: 'Event',
  showEmitterSubtext: true,
  folderObjectColumnTitle: 'Object',
  showFolderInFolderObjectColumn: false,
})
