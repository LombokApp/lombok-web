import { Controller, Get, Param } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { EventService } from '../services/event.service'

@Controller('/events')
@ApiTags('Event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  /**
   * Get an event by id.
   */
  @Get('/:eventId')
  getAppInfo(@Param() eventId: string) {
    return this.eventService.getEvent(eventId)
  }
}
