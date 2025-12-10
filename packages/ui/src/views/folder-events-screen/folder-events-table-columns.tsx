import { configureEventsTableColumns } from '@/src/components/events-table-columns/events-table-columns'

export const folderEventsTableColumns = configureEventsTableColumns({
  getLinkTo: (event) =>
    `/folders/${event.targetLocation?.folderId}/events/${event.id}`,
  eventIdentifierTitle: 'Event',
  showActorSubtext: true,
  folderObjectColumnTitle: 'Object',
  showFolderInFolderObjectColumn: false,
})
