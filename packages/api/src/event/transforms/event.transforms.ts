import type { EventDTO } from '../dto/event.dto'
import type { Event } from '../entities/event.entity'

export function transformEventToDTO(event: Event): EventDTO {
  return {
    id: event.id,
    emitterIdentifier: event.emitterIdentifier,
    eventKey: event.eventKey,
    level: event.level,
    locationContext: event.folderId
      ? {
          folderId: event.folderId,
          objectKey: event.objectKey ? event.objectKey : undefined,
        }
      : undefined,
    data: event.data,
    createdAt: event.createdAt,
  }
}
