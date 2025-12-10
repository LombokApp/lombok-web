import type {
  EventDTO,
  EventWithTargetLocationContextDTO,
} from '../dto/event.dto'
import type { Event } from '../entities/event.entity'

// Overload for when folder is present
export function transformEventToDTO(
  event: Event & { folder: { name: string; ownerId: string } },
): EventWithTargetLocationContextDTO

// Overload for when folder is not present
export function transformEventToDTO(event: Event): EventDTO

export function transformEventToDTO(
  event: Event & { folder?: { name: string; ownerId: string } },
): EventDTO | EventWithTargetLocationContextDTO {
  const baseDTO: EventDTO = {
    id: event.id,
    emitterIdentifier: event.emitterIdentifier,
    eventIdentifier: event.eventIdentifier,
    data: event.data ?? {},
    targetLocation: event.targetLocation ?? undefined,
    createdAt: event.createdAt.toISOString(),
  }

  // If folder is present, add subjectContext and return EventWithFolderSubjectContextDTO
  if (event.targetLocation?.folderId && event.folder) {
    return {
      ...baseDTO,
      targetLocationContext: {
        folderId: event.targetLocation.folderId,
        objectKey: event.targetLocation.objectKey ?? undefined,
        folderName: event.folder.name,
        folderOwnerId: event.folder.ownerId,
      },
    }
  }

  // Otherwise return base EventDTO
  return baseDTO
}
