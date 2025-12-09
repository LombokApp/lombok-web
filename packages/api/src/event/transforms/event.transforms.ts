import type { EventDTO } from '../dto/event.dto'
import type { Event } from '../entities/event.entity'

export function transformEventToDTO(
  event: Event & { folder?: { name: string; ownerId: string } },
): EventDTO {
  const baseDTO: EventDTO = {
    id: event.id,
    emitterIdentifier: event.emitterIdentifier,
    eventIdentifier: event.eventIdentifier,
    data: event.data ?? {},
    createdAt: event.createdAt.toISOString(),
  }

  if (event.targetLocation?.folderId && event.folder) {
    return {
      ...baseDTO,
      subjectContext: {
        folderId: event.targetLocation.folderId,
        objectKey: event.targetLocation.objectKey ?? undefined,
        folderName: event.folder.name,
        folderOwnerId: event.folder.ownerId,
      },
    }
  }

  return baseDTO
}
