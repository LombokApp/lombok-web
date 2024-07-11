import type { EventDTO } from '../dto/event.dto'
import type { Event } from '../entities/event.entity'

export function transformEventToDTO(event: Event): EventDTO {
  return {
    id: event.id,
    eventKey: event.eventKey,
    data: event.data,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  }
}
