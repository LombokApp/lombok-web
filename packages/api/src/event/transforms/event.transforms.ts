import type { EventDTO } from '../dto/event.dto'
import type { Event } from '../entities/event.entity'

export function transformEventToDTO(
  event: Event & { folder?: { name: string; ownerId: string } },
): EventDTO {
  return {
    id: event.id,
    emitterIdentifier: event.emitterIdentifier,
    eventKey: event.eventKey,
    subjectContext:
      event.subjectFolderId && event.folder
        ? {
            folderId: event.subjectFolderId,
            objectKey: event.subjectObjectKey ?? undefined,
            folderName: event.folder.name,
            folderOwnerId: event.folder.ownerId,
          }
        : undefined,
    data: event.data,
    createdAt: event.createdAt,
  }
}
